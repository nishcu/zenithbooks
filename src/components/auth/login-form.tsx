
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
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ZenithBooksLogo } from "../icons"
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { VALIDATION_MESSAGES, TOAST_MESSAGES } from "@/lib/constants";
import { showErrorToast, showSuccessToast } from "@/lib/error-handler";
import { 
  isAccountLocked, 
  recordFailedLogin, 
  clearFailedLoginAttempts,
  getLoginIdentifier,
  sanitizeEmail 
} from "@/lib/security/auth-utils";


const formSchema = z.object({
  email: z.string().email({ message: VALIDATION_MESSAGES.EMAIL }),
  password: z.string().min(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms & Conditions"
  }),
  acceptRefunds: z.boolean().refine(val => val === true, {
    message: "You must accept the Cancellation & Refund Policy"
  }),
});

const passwordResetSchema = z.object({
  resetEmail: z.string().email({ message: VALIDATION_MESSAGES.EMAIL }),
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
      acceptTerms: false,
      acceptRefunds: false,
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
      // Sanitize email input
      const sanitizedEmail = sanitizeEmail(values.email);
      
      // Check if account is locked
      const loginId = getLoginIdentifier(sanitizedEmail);
      if (isAccountLocked(loginId)) {
        toast({
          variant: "destructive",
          title: "Account Locked",
          description: "Too many failed login attempts. Please try again later.",
        });
        setIsEmailLoading(false);
        return;
      }

      await signInWithEmailAndPassword(auth, sanitizedEmail, values.password);
      
      // Clear failed login attempts on success
      clearFailedLoginAttempts(loginId);
      
      showSuccessToast(TOAST_MESSAGES.SUCCESS.LOGIN.title, TOAST_MESSAGES.SUCCESS.LOGIN.description);
      router.push("/dashboard");
    } catch (error: any) {
      // Record failed login attempt
      const loginId = getLoginIdentifier(values.email);
      const attemptResult = recordFailedLogin(loginId);
      
      if (attemptResult.locked) {
        toast({
          variant: "destructive",
          title: "Account Locked",
          description: "Too many failed login attempts. Your account has been locked for 15 minutes.",
        });
      } else {
        showErrorToast(error, "Login");
        if (attemptResult.remainingAttempts < 3) {
          toast({
            variant: "destructive",
            title: "Warning",
            description: `${attemptResult.remainingAttempts} login attempts remaining before account lockout.`,
          });
        }
      }
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
          toast({ variant: "destructive", title: VALIDATION_MESSAGES.REQUIRED, description: "Please enter your email address." });
          return;
      }
      try {
          await sendPasswordResetEmail(auth, resetEmail);
          showSuccessToast("Password Reset Email Sent", "Please check your inbox for instructions to reset your password.");
          setIsForgotPasswordOpen(false);
          setResetEmail("");
      } catch (error: any) {
           showErrorToast(error, "Password Reset");
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
                                <FormLabel htmlFor="email">Email</FormLabel>
                                <FormControl>
                                <Input 
                                    id="email"
                                    type="email"
                                    placeholder="m@example.com" 
                                    aria-label="Email address"
                                    aria-required="true"
                                    {...field} 
                                />
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
                                    <FormLabel htmlFor="password">Password</FormLabel>
                                    <Button
                                        variant="link"
                                        type="button"
                                        onClick={() => setIsForgotPasswordOpen(true)}
                                        className="ml-auto inline-block text-sm underline"
                                        aria-label="Forgot password"
                                    >
                                        Forgot your password?
                                    </Button>
                                </div>
                                <FormControl>
                                <Input
                                    id="password"
                                    type="password"
                                    aria-label="Password"
                                    aria-required="true"
                                    {...field}
                                />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <div className="space-y-1.5">
                            <FormField
                                control={form.control}
                                name="acceptTerms"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="mt-0.5 h-3 w-3"
                                        />
                                    </FormControl>
                                    <div className="leading-tight">
                                        <FormLabel className="text-[10px] font-normal text-muted-foreground">
                                            I accept the{" "}
                                            <a href="/contact" className="text-primary underline text-[10px] hover:text-primary/80">
                                                Terms & Conditions
                                            </a>
                                        </FormLabel>
                                        <FormMessage className="text-[10px]" />
                                    </div>
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="acceptRefunds"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="mt-0.5 h-3 w-3"
                                        />
                                    </FormControl>
                                    <div className="leading-tight">
                                        <FormLabel className="text-[10px] font-normal text-muted-foreground">
                                            I accept the{" "}
                                            <a href="/contact" className="text-primary underline text-[10px] hover:text-primary/80">
                                                Cancellation & Refund Policy
                                            </a>
                                        </FormLabel>
                                        <FormMessage className="text-[10px]" />
                                    </div>
                                </FormItem>
                                )}
                            />
                        </div>

                        <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={isEmailLoading || isGoogleLoading}
                            aria-label="Login to your account"
                        >
                            {isEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
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
                    <Button 
                        variant="outline" 
                        className="w-full" 
                        onClick={handleGoogleLogin} 
                        disabled={isEmailLoading || isGoogleLoading}
                        aria-label="Login with Google"
                    >
                        {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
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
                    <Input 
                        id="reset-email" 
                        type="email" 
                        placeholder="you@example.com" 
                        value={resetEmail} 
                        onChange={(e) => setResetEmail(e.target.value)}
                        aria-label="Email address for password reset"
                        aria-required="true"
                    />
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
