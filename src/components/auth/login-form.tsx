
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  acceptPolicies: z.boolean().refine(val => val === true, {
    message: "You must accept the Terms & Conditions and Cancellation & Refund Policy"
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
  const [isPoliciesModalOpen, setIsPoliciesModalOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      acceptPolicies: false,
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

                        <FormField
                            control={form.control}
                            name="acceptPolicies"
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
                                                onClick={() => setIsPoliciesModalOpen(true)}
                                                className="text-primary underline text-[10px] hover:text-primary/80 bg-transparent border-none p-0 cursor-pointer"
                                            >
                                                Terms & Conditions and Cancellation & Refund Policy
                                            </button>
                                    </FormLabel>
                                    <FormMessage className="text-[10px]" />
                                </div>
                            </FormItem>
                            )}
                        />

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

        <Dialog open={isPoliciesModalOpen} onOpenChange={setIsPoliciesModalOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Terms & Conditions and Cancellation & Refund Policy</DialogTitle>
                    <DialogDescription>
                        Please read and understand our policies before proceeding.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-8">
                    {/* Terms & Conditions */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Terms & Conditions</h3>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>Last updated on 23-11-2025 21:56:49</strong></p>
                            <p>These Terms and Conditions, along with privacy policy or other terms ("Terms") constitute a binding agreement by and between zenithbooks, ("Website Owner" or "we" or "us" or "our") and you ("you" or "your") and relate to your use of our website, goods (as applicable) or services (as applicable) (collectively, "Services").</p>
                            <p>By using our website and availing the Services, you agree that you have read and accepted these Terms (including the Privacy Policy). We reserve the right to modify these Terms at any time and without assigning any reason. It is your responsibility to periodically review these Terms to stay informed of updates.</p>
                            <p>The use of this website or availing of our Services is subject to the following terms of use:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>To access and use the Services, you agree to provide true, accurate and complete information to us during and after registration, and you shall be responsible for all acts done through the use of your registered account.</li>
                                <li>Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness or suitability of the information and materials offered on this website or through the Services, for any specific purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.</li>
                                <li>Your use of our Services and the website is solely at your own risk and discretion. You are required to independently assess and ensure that the Services meet your requirements.</li>
                                <li>The contents of the Website and the Services are proprietary to Us and you will not have any authority to claim any intellectual property rights, title, or interest in its contents.</li>
                                <li>You acknowledge that unauthorized use of the Website or the Services may lead to action against you as per these Terms or applicable laws.</li>
                                <li>You agree to pay us the charges associated with availing the Services.</li>
                                <li>You agree not to use the website and/ or Services for any purpose that is unlawful, illegal or forbidden by these Terms, or Indian or local laws that might apply to you.</li>
                                <li>You agree and acknowledge that website and the Services may contain links to other third party websites. On accessing these links, you will be governed by the terms of use, privacy policy and such other policies of such third party websites.</li>
                                <li>You understand that upon initiating a transaction for availing the Services you are entering into a legally binding and enforceable contract with the us for the Services.</li>
                                <li>You shall be entitled to claim a refund of the payment made by you in case we are not able to provide the Service. The timelines for such return and refund will be according to the specific Service you have availed or within the time period provided in our policies (as applicable). In case you do not raise a refund claim within the stipulated time, than this would make you ineligible for a refund.</li>
                                <li>Notwithstanding anything contained in these Terms, the parties shall not be liable for any failure to perform an obligation under these Terms if performance is prevented or delayed by a force majeure event.</li>
                                <li>These Terms and any dispute or claim relating to it, or its enforceability, shall be governed by and construed in accordance with the laws of India.</li>
                                <li>All disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana</li>
                                <li>All concerns or communications relating to these Terms must be communicated to us using the contact information provided on this website.</li>
                            </ul>
                        </div>
                    </div>

                    {/* Cancellation & Refund Policy */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Cancellation & Refund Policy</h3>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p><strong>Last updated on 23-11-2025 21:57:16</strong></p>
                            <p>zenithbooks believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:</p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                                <li>Cancellations will be considered only if the request is made immediately after placing the order. However, the cancellation request may not be entertained if the orders have been communicated to the vendors/merchants and they have initiated the process of shipping them.</li>
                                <li>zenithbooks does not accept cancellation requests for perishable items like flowers, eatables etc. However, refund/replacement can be made if the customer establishes that the quality of product delivered is not good.</li>
                                <li>In case of receipt of damaged or defective items please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at his own end. This should be reported within 2 Days days of receipt of the products. In case you feel that the product received is not as shown on the site or as per your expectations, you must bring it to the notice of our customer service within 2 Days days of receiving the product. The Customer Service Team after looking into your complaint will take an appropriate decision.</li>
                                <li>In case of complaints regarding products that come with a warranty from manufacturers, please refer the issue to them. In case of any Refunds approved by the zenithbooks, it'll take 9-15 Days days for the refund to be processed to the end customer.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    </>
  )
}
