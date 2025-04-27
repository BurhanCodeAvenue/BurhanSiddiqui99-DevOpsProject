
// src/types/socket.ts
import type { Server as NetServer } from "http";
import type { NextApiResponse } from "next";
import type { Server as ServerIO } from "socket.io";

// Define the structure of the server object expected on the response socket
export interface SocketServer extends NetServer {
  io?: ServerIO; // Mark io as optional as it's added dynamically
}

// Define the custom NextApiResponse type that includes the socket with its server
export interface NextApiResponseServerIO extends NextApiResponse {
  socket: {
    server: SocketServer;
    // You might add other properties to the socket object if needed
  };
}

// You can add other socket-related types here if needed
// Example: UserSocket type if you augment the socket instance
// import type { Socket } from "socket.io";
// export interface UserSocket extends Socket {
//   userId?: string;
// }
