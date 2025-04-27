
// src/app/api/socket/io.ts
import { Server as NetServer } from "http";
import type { NextApiRequest } from "next"; // Use specific types for API routes
import type { NextApiResponseServerIO } from "@/types/socket"; // Use custom type
import { Server as ServerIO, Socket } from "socket.io";
import type { User } from '@/types/user';
import type { Message } from '@/types/message';
import { db } from "@/server/config/firebaseAdmin";
import { verifyToken } from '@/server/utils/authUtils';
import admin from 'firebase-admin';

console.log("Loading /api/socket/io.ts module..."); // Log module load

// Define custom types for better clarity - Moved to types/socket.ts
// interface SocketServer extends NetServer {
//     io?: ServerIO;
// }
// interface NextApiResponseServerIO extends NextApiResponse {
//   socket: SocketServer & {
//     server: SocketServer;
//   };
// }
interface UserSocket extends Socket {
    userId?: string;
}

const onlineUsers = new Map<string, string>(); // Map<userId, socketId>

export const config = {
    api: {
        bodyParser: false,
    },
};

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
    console.log(`[Socket Handler] Request received for ${req.url}`); // Log request entry

    // Check if Socket.IO server is already attached
    // Use optional chaining and nullish coalescing for safety
    if (res.socket?.server?.io) {
        console.log('[Socket Handler] Socket.IO server already running.');
    } else {
        console.log('[Socket Handler] Initializing Socket.IO server...');

        // Ensure server object exists
        if (!res.socket?.server) {
            console.error('[Socket Handler Error] HTTP server instance is missing on the response socket.');
            res.status(500).json({ message: "Internal Server Error: HTTP server not found" });
            return;
        }

        const httpServer: NetServer = res.socket.server;
        const io = new ServerIO(httpServer, {
            path: '/api/socket/io', // Ensure this matches client path exactly
            addTrailingSlash: false,
            cors: {
                origin: process.env.NEXT_PUBLIC_API_URL || "*",
                methods: ["GET", "POST"],
                credentials: true, // Important if handling cookies/auth headers
            },
            pingTimeout: 60000, // Keep increased timeouts
            pingInterval: 25000,
            connectTimeout: 20000, // Keep increased connection timeout
        });

        // Middleware for authentication
        io.use(async (socket: Socket, next) => {
            // Consistent casting
            const userSocket = socket as UserSocket;
            const token = userSocket.handshake.auth.token as string;
            const userId = userSocket.handshake.query.userId as string;

            console.log(`[Socket Auth] Attempting connection - SocketID: ${userSocket.id}, UserID: ${userId}, Token Present: ${!!token}`);

            if (!token || !userId) {
                console.error(`[Socket Auth Failed] Missing token or userId. SocketID: ${userSocket.id}`);
                return next(new Error('Authentication error: Token or UserID missing.'));
            }

            try {
                // Add audience/issuer verification if configured during token generation
                const decoded = verifyToken(token) as User & { iat: number; exp: number };

                if (!decoded || decoded.id !== userId) {
                    console.error(`[Socket Auth Failed] Token invalid or mismatch. Decoded ID: ${decoded?.id}, Query ID: ${userId}, SocketID: ${userSocket.id}`);
                    return next(new Error('Authentication error: Token mismatch or invalid.'));
                }

                userSocket.userId = userId; // Assign userId AFTER successful verification
                console.log(`[Socket Auth Success] User authenticated. UserID: ${userId}, SocketID: ${userSocket.id}`);
                next(); // Proceed with connection
            } catch (error: any) {
                console.error(`[Socket Auth Failed] Token verification error. UserID: ${userId}, SocketID: ${userSocket.id}, Error: ${error.message}`);
                // Send a more specific error message if possible
                next(new Error(`Authentication error: ${error.message || 'Invalid token.'}`));
            }
        });

        // Handle new client connections (after successful authentication)
        io.on('connection', (socket: Socket) => {
            const userSocket = socket as UserSocket; // Cast again for type safety
            const userId = userSocket.userId;

            if (!userId) {
                console.error(`[Socket Connection Error] userId missing on authenticated socket ${socket.id}. Disconnecting.`);
                socket.disconnect(true);
                return;
            }

            console.log(`✅ [Socket Connected] UserID: ${userId}, SocketID: ${socket.id}`);

            const previousSocketId = onlineUsers.get(userId);
            if (previousSocketId && previousSocketId !== socket.id) {
                console.warn(`[Socket Reconnect] User ${userId} connected with new socket ${socket.id}. Previous socket: ${previousSocketId}`);
                io.sockets.sockets.get(previousSocketId)?.disconnect(true);
            }
            onlineUsers.set(userId, socket.id);

            if (db) {
                db.collection('users').doc(userId).update({
                    socketId: socket.id,
                    online: true,
                    lastSeen: new Date().toISOString(),
                }).then(() => {
                    console.log(`[Firestore Update] User online status updated for UserID: ${userId}`);
                }).catch(dbError => console.error(`[Firestore Error] Failed update user online status (connect) for UserID ${userId}:`, dbError));
            } else {
                console.warn("[Firestore Warn] DB not available, skipping user online status update on connect.");
            }

            socket.join(userId); // Join room for direct messaging
            console.log(`[Socket Room] Socket ${socket.id} joined room ${userId}`);

            const currentOnlineUsers = Array.from(onlineUsers.keys());
            io.emit('update-online-users', currentOnlineUsers);
            console.log('[Socket Emit] Emitted update-online-users:', currentOnlineUsers);

            socket.on('send-message', (message: Omit<Message, 'id' | 'timestamp'>, callback) => {
                console.log(`[Socket Receive] 'send-message' from UserID: ${message.senderId} to UserID: ${message.receiverId}. Socket: ${socket.id}`);
                const fullMessage: Message = {
                    ...message,
                    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                    timestamp: new Date().toISOString(),
                };
                io.to(message.receiverId).emit('receive-message', fullMessage);
                console.log(`[Socket Emit] Emitted 'receive-message' to room ${message.receiverId}. MessageID: ${fullMessage.id}`);
                if (typeof callback === 'function') {
                    callback({ status: "ok", messageId: fullMessage.id });
                }
            });

            socket.on('disconnect', (reason) => {
                console.log(`❌ [Socket Disconnected] UserID: ${userId}, SocketID: ${socket.id}, Reason: ${reason}`);
                if (onlineUsers.get(userId) === socket.id) {
                    onlineUsers.delete(userId);
                    console.log(`[Online Users] Removed UserID: ${userId} from online map.`);
                    if (db) {
                        db.collection('users').doc(userId).update({
                            online: false,
                            lastSeen: new Date().toISOString(),
                            // Optional: Clear socketId field if needed
                            // socketId: admin.firestore.FieldValue.delete(),
                        }).then(() => {
                             console.log(`[Firestore Update] User offline status updated for UserID: ${userId}`);
                        }).catch(dbError => console.error(`[Firestore Error] Failed update user status (disconnect) for UserID ${userId}:`, dbError));
                    } else {
                        console.warn("[Firestore Warn] DB not available, skipping user status update on disconnect.");
                    }
                    const updatedOnlineUsers = Array.from(onlineUsers.keys());
                    io.emit('update-online-users', updatedOnlineUsers);
                    console.log('[Socket Emit] Emitted update-online-users after disconnect:', updatedOnlineUsers);
                } else {
                    console.log(`[Socket Disconnect] Ignoring disconnect for UserID: ${userId}, SocketID: ${socket.id} (stored socket is ${onlineUsers.get(userId)})`);
                }
            });

            socket.on('error', (err) => {
                console.error(`[Socket Error] Error on socket ${socket.id} (UserID: ${userId}):`, err.message);
            });
        });

        // Attach io instance to the server object *only after* setup
        res.socket.server.io = io;
        console.log("✅ [Socket Handler] Socket.IO server initialized and attached successfully.");
    }

    res.end(); // End the API route response cleanly
};

export default ioHandler;
