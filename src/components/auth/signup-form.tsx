
"use client"

import { useState } from "react";
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
  Form,
  FormControl,
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { VALIDATION_MESSAGES, TOAST_MESSAGES } from "@/lib/constants";
import { showErrorToast, showSuccessToast } from "@/lib/error-handler";
import { checkPasswordStrength, sanitizeEmail } from "@/lib/security/auth-utils";
import { useEffect } from "react";

const formSchema = z.object({
  userType: z.enum(["business", "professional"], {
    required_error: VALIDATION_MESSAGES.REQUIRED,
  }),
  companyName: z.string().min(2, { message: VALIDATION_MESSAGES.REQUIRED }),
  email: z.string().email({ message: VALIDATION_MESSAGES.EMAIL }),
  password: z.string().min(6, { message: VALIDATION_MESSAGES.PASSWORD_MIN }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms & Conditions"
  }),
  acceptRefunds: z.boolean().refine(val => val === true, {
    message: "You must accept the Cancellation & Refund Policy"
  }),
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        userType: "business",
        companyName: "",
        email: "",
        password: "",
        acceptTerms: false,
        acceptRefunds: false,
    }
  });

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User has successfully signed in via Google redirect
          const user = result.user;
          
          // Check if user document already exists
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            // Create user document with default values
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              userType: "business", // Default to business
              companyName: user.displayName || "My Company",
              createdAt: new Date(),
            });
          }
          
          toast({ title: "Signup Successful", description: "Welcome to ZenithBooks!" });
          router.push("/dashboard");
        } else {
          // No redirect result, probably a direct page load
          setIsCheckingRedirect(false);
        }
      } catch (error: any) {
        console.error("Google Signup Error:", error);
        toast({
          variant: "destructive",
          title: "Google Signup Failed",
          description: error.message || "An unknown error occurred.",
        });
        setIsCheckingRedirect(false);
        setIsGoogleLoading(false);
      }
    };

    handleRedirectResult();
  }, [router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Sanitize email input
      const sanitizedEmail = sanitizeEmail(values.email);
      
      // Check password strength
      const passwordCheck = checkPasswordStrength(values.password);
      if (!passwordCheck.valid) {
        toast({
          variant: "destructive",
          title: "Weak Password",
          description: passwordCheck.feedback.join(". "),
        });
        setIsLoading(false);
        return;
      }

      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        sanitizedEmail,
        values.password
      );
      const user = userCredential.user;

      // 2. Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        userType: values.userType,
        companyName: values.companyName,
        createdAt: new Date(),
      });

      showSuccessToast(TOAST_MESSAGES.SUCCESS.SIGNUP.title, TOAST_MESSAGES.SUCCESS.SIGNUP.description);

      // 3. Redirect to dashboard, user is now logged in.
      router.push("/dashboard");

    } catch (error: any) {
      showErrorToast(error, "Signup");
    } finally {
        setIsLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setIsGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
            <ZenithBooksLogo className="mx-auto h-12 w-12" />
          <CardTitle className="text-2xl">Create an Account</CardTitle>
          <CardDescription>
            Enter your information to create an account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCheckingRedirect ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="mr-2 h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Checking for signup...</p>
            </div>
          ) : (
            <>
              <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField
                control={form.control}
                name="userType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>I am a...</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <FormItem>
                           <RadioGroupItem value="business" id="business" className="peer sr-only" />
                            <Label htmlFor="business" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Business Owner
                            </Label>
                        </FormItem>
                         <FormItem>
                           <RadioGroupItem value="professional" id="professional" className="peer sr-only" />
                            <Label htmlFor="professional" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                Professional
                            </Label>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company / Firm Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
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
                          <button
                            type="button"
                            onClick={() => window.location.href = '/contact'}
                            className="text-primary underline text-[10px] hover:text-primary/80 bg-transparent border-none p-0 cursor-pointer"
                          >
                            Terms & Conditions
                          </button>
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
                          <button
                            type="button"
                            onClick={() => window.location.href = '/contact'}
                            className="text-primary underline text-[10px] hover:text-primary/80 bg-transparent border-none p-0 cursor-pointer"
                          >
                            Cancellation & Refund Policy
                          </button>
                        </FormLabel>
                        <FormMessage className="text-[10px]" />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create an account
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
            onClick={handleGoogleSignup} 
            disabled={isLoading || isGoogleLoading}
            aria-label="Sign up with Google"
          >
            {isGoogleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Sign up with Google
          </Button>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Sign in
            </Link>
          </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
