import { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface CertificationRequestData {
  reportType: string;
  clientName: string;
  formData: any;
}

interface UseCertificationRequestProps {
  pricing: any;
  serviceId: string;
  onPaymentSuccess?: (paymentId: string) => void;
}

export function useCertificationRequest({ pricing, serviceId, onPaymentSuccess }: UseCertificationRequestProps) {
  const [user] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCertificationRequest = async (requestData: CertificationRequestData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to make a request."
      });
      return false;
    }

    // Check if pricing is loaded
    if (!pricing) {
      toast({
        variant: "destructive",
        title: "Loading",
        description: "Please wait while we load pricing information."
      });
      return false;
    }

    // Get the price for the service
    const price = pricing.ca_certs?.find((s: any) => s.id === serviceId)?.price || 0;

    if (price === 0) {
      // Free service - proceed directly
      setIsSubmitting(true);
      try {
        await addDoc(collection(db, "certificationRequests"), {
          ...requestData,
          requestedBy: user.displayName || user.email,
          userId: user.uid,
          requestDate: new Date(),
          status: "Pending",
          draftUrl: "#",
          signedDocumentUrl: null,
          amount: 0, // Free
        });
        toast({
          title: "Request Sent",
          description: "Your certification request has been sent to the admin for review and signature."
        });
        return true;
      } catch (error) {
        console.error("Error sending request:", error);
        toast({
          variant: "destructive",
          title: "Request Failed",
          description: "Could not send the request. Please try again."
        });
        return false;
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Paid service - return price info for payment component
      return { requiresPayment: true, price };
    }
  };

  const handlePaymentSuccess = async (paymentId: string, requestData: CertificationRequestData) => {
    setIsSubmitting(true);
    try {
      const price = pricing.ca_certs?.find((s: any) => s.id === serviceId)?.price || 0;
      await addDoc(collection(db, "certificationRequests"), {
        ...requestData,
        requestedBy: user?.displayName || user?.email,
        userId: user?.uid,
        requestDate: new Date(),
        status: "Pending",
        draftUrl: "#",
        signedDocumentUrl: null,
        amount: price,
        paymentId: paymentId,
      });
      toast({
        title: "Payment Successful & Request Sent",
        description: "Your payment has been processed and certification request sent to admin."
      });
      onPaymentSuccess?.(paymentId);
      return true;
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: "Payment was successful but request submission failed. Please contact support."
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleCertificationRequest,
    handlePaymentSuccess,
    isSubmitting
  };
}






