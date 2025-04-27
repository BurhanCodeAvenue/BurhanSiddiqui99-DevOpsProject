"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/lib/store";
import { setLoading, setError, setUser } from "@/lib/features/auth/authSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { signup } from "@/services/authService"; // Assuming authService exists

// Remove profilePic from schema as FileList is not available server-side
const signupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  // profilePic: z.instanceof(FileList).optional(), // Removed this line
});

// Update FormData type to reflect schema changes
type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      // Basic implementation without profile picture upload for now
      // The backend will generate a placeholder if none is provided
      // const profilePicUrl = data.profilePic?.[0] ? URL.createObjectURL(data.profilePic[0]) : undefined;

      // Call signup service
      const response = await signup({ name: data.name, email: data.email, password: data.password }); // Removed profilePic for now

      if (response.user && response.token) {
        dispatch(setUser({ user: response.user, token: response.token }));
        toast({
          title: "Signup Successful!",
          description: "Welcome to ChatterBox.",
        });
        router.push("/chat"); // Redirect to chat dashboard
      } else {
         // This case might not be reached if signup service throws errors
         throw new Error(response.message || "Signup failed. Please try again.");
      }
    } catch (err: any) {
      let errorMessage = "An unknown error occurred.";
      if (err.response) {
        // Handle specific API errors
        errorMessage = err.response.data?.message || `Request failed with status ${err.response.status}`;
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = "No response from server. Please check your connection.";
      } else {
        // Something happened in setting up the request
        errorMessage = err.message;
      }

      dispatch(setError(errorMessage));
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage,
      });
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>Join ChatterBox today!</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
                 aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                 className={errors.password ? "border-destructive" : ""}
                 aria-invalid={errors.password ? "true" : "false"}
              />
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {/* Profile picture input removed for now */}
            {/* <div>
              <Label htmlFor="profilePic">Profile Picture (Optional)</Label>
              <Input id="profilePic" type="file" {...register("profilePic")} />
              {errors.profilePic && <p className="mt-1 text-xs text-destructive">{errors.profilePic.message?.toString()}</p>}
            </div> */}
            {/* Server-side error display */}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Sign Up
            </Button>
          </form>
        </CardContent>
         <CardFooter className="flex justify-center">
           <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
