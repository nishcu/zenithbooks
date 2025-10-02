
"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ZenithBooksLogo } from "../icons"
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const passwordResetSchema = z.object({
    resetEmail: z.string().email({ message: "Please enter a valid email." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

   useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has successfully signed in via redirect.
          toast({ title: "Login Successful", description: "Welcome!" });
          router.push("/dashboard");
        } else {
            // No redirect result, probably a direct page load
            setIsCheckingRedirect(false);
        }
      } catch (error: any) {
        console.error("Google Login Error:", error);
        toast({
          variant: "destructive",
          title: "Google Login Failed",
          description: error.message || "An unknown error occurred.",
        });
        setIsCheckingRedirect(false);
        setIsGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, [router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Login Error: ", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsEmailLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  }

  async function handlePasswordReset() {
      if (!resetEmail) {
          toast({ variant: "destructive", title: "Email required", description: "Please enter your email address." });
          return;
      }
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          toast({ title: "Password Reset Email Sent", description: "Please check your inbox for instructions to reset your password."});
          setIsForgotPasswordOpen(false);
          setResetEmail("");
      } catch (error: any) {
           toast({ variant: "destructive", title: "Error", description: error.message || "Failed to send password reset email."});
      }
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader className="text-center space-y-4">
            <ZenithBooksLogo className="mx-auto h-12 w-12 text-primary" />
             <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">ZenithBooks</h1>
            </div>
            <CardTitle className="text-2xl !mt-2">Welcome Back</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isCheckingRedirect ? (
                 <div className="flex flex-col items-center justify-center h-48">
                    <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-muted-foreground">Checking for login...</p>
                </div>
            ) : (
                <>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                <Input placeholder="m@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center">
                                    <FormLabel>Password</FormLabel>
                                    <Button variant="link" type="button" onClick={() => setIsForgotPasswordOpen(true)} className="ml-auto inline-block text-sm underline">
                                        Forgot your password?
                                    </Button>
                                </div>
                                <FormControl>
                                <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isEmailLoading || isGoogleLoading}>
                            {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Login
                        </Button>
                        </form>
                    </Form>
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={isEmailLoading || isGoogleLoading}>
                        {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Login with Google
                    </Button>
                    <div className="mt-4 text-center text-sm">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="underline">
                        Sign up
                        </Link>
                    </div>
                </>
            )}
          </CardContent>
        </Card>
      </div>

       <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Forgot Password</DialogTitle>
                    <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                     <Label htmlFor="reset-email">Email Address</Label>
                    <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsForgotPasswordOpen(false)}>Cancel</Button>
                    <Button onClick={handlePasswordReset}>Send Reset Link</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  )
}
