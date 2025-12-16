"use client";

import { useState, useContext, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AccountingContext } from "@/context/accounting-context";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { collection, query, where } from "firebase/firestore";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from "react-firebase-hooks/auth";

const voiceInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  invoiceDate: z.string().min(1, "Date is required."),
  itemId: z.string().optional(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than zero.").optional(),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
  taxRate: z.coerce.number().min(0, "Tax rate cannot be negative."),
});

type VoiceInvoiceForm = z.infer<typeof voiceInvoiceSchema>;

// Helper function to convert Indian number words to numbers
function parseIndianNumber(text: string): number {
  const words = text.toLowerCase().trim();
  let number = 0;
  
  // Handle lakhs
  const lakhMatch = words.match(/(\d+(?:\.\d+)?)\s*lakh/i);
  if (lakhMatch) {
    number += parseFloat(lakhMatch[1]) * 100000;
  }
  
  // Handle crores
  const croreMatch = words.match(/(\d+(?:\.\d+)?)\s*crore/i);
  if (croreMatch) {
    number += parseFloat(croreMatch[1]) * 10000000;
  }
  
  // Handle thousands
  const thousandMatch = words.match(/(\d+(?:\.\d+)?)\s*thousand/i);
  if (thousandMatch) {
    number += parseFloat(thousandMatch[1]) * 1000;
  }
  
  // Handle regular numbers
  const numberMatch = words.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch && !lakhMatch && !croreMatch && !thousandMatch) {
    number = parseFloat(numberMatch[1]);
  }
  
  return number;
}

// Fuzzy match function for customer/product names
function fuzzyMatch(searchText: string, targetText: string): number {
  const search = searchText.toLowerCase().trim();
  const target = targetText.toLowerCase().trim();
  
  // Exact match
  if (target === search) return 1.0;
  
  // Contains match
  if (target.includes(search) || search.includes(target)) return 0.8;
  
  // Word-based match
  const searchWords = search.split(/\s+/);
  const targetWords = target.split(/\s+/);
  const matchingWords = searchWords.filter(word => 
    targetWords.some(tWord => tWord.includes(word) || word.includes(tWord))
  );
  
  return matchingWords.length / Math.max(searchWords.length, targetWords.length);
}

// Parse voice input to extract customer, product, and quantity
function parseVoiceInput(
  text: string,
  customers: any[],
  items: any[]
): { customerId: string | null; itemId: string | null; quantity: number | null; amount: number | null } {
  const lowerText = text.toLowerCase();
  
  // Enhanced patterns for voice commands
  // Pattern 1: "Create invoice for [customer], [product], quantity [number]"
  // Pattern 2: "Invoice [customer] for [product] [number] pieces"
  // Pattern 3: "[customer] [product] [number]"
  
  // Find customer - try multiple patterns
  let bestCustomer: any = null;
  let bestCustomerScore = 0;
  
  // Try to find customer name after keywords like "for", "to", "customer"
  const customerKeywords = ['for', 'to', 'customer', 'client', 'party'];
  let customerSearchText = lowerText;
  
  for (const keyword of customerKeywords) {
    const keywordIndex = lowerText.indexOf(keyword);
    if (keywordIndex !== -1) {
      customerSearchText = lowerText.substring(keywordIndex + keyword.length).trim();
      break;
    }
  }
  
  // Search for customer
  for (const customer of customers) {
    const customerName = customer.name.toLowerCase();
    // Try exact match in the search text
    if (customerSearchText.includes(customerName) || customerName.includes(customerSearchText.split(' ')[0])) {
      const score = fuzzyMatch(customer.name, customerSearchText);
      if (score > bestCustomerScore && score > 0.2) {
        bestCustomerScore = score;
        bestCustomer = customer;
      }
    } else {
      // Try fuzzy match on entire text
      const score = fuzzyMatch(customer.name, text);
      if (score > bestCustomerScore && score > 0.3) {
        bestCustomerScore = score;
        bestCustomer = customer;
      }
    }
  }
  
  // Find product/item - try multiple patterns
  let bestItem: any = null;
  let bestItemScore = 0;
  
  // Try to find product name after customer or keywords
  let itemSearchText = lowerText;
  if (bestCustomer) {
    const customerNameIndex = lowerText.indexOf(bestCustomer.name.toLowerCase());
    if (customerNameIndex !== -1) {
      itemSearchText = lowerText.substring(customerNameIndex + bestCustomer.name.length).trim();
    }
  }
  
  // Search for item
  for (const item of items) {
    const itemName = item.name.toLowerCase();
    // Try exact match in the search text
    if (itemSearchText.includes(itemName) || itemName.includes(itemSearchText.split(' ')[0])) {
      const score = fuzzyMatch(item.name, itemSearchText);
      if (score > bestItemScore && score > 0.2) {
        bestItemScore = score;
        bestItem = item;
      }
    } else {
      // Try fuzzy match on entire text
      const score = fuzzyMatch(item.name, text);
      if (score > bestItemScore && score > 0.3) {
        bestItemScore = score;
        bestItem = item;
      }
    }
  }
  
  // Extract quantity - enhanced patterns
  let quantity: number | null = null;
  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*(?:quantity|qty|pieces?|units?|nos?|numbers?|pcs?|pcs)/i,
    /quantity\s*(?:of|is)?\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:x|times|×)/i,
    /(\d+(?:\.\d+)?)\s*(?:piece|unit|no|number)/i,
    /(\d+(?:\.\d+)?)\s*(?:of|for)/i,
  ];
  
  for (const pattern of quantityPatterns) {
    const match = text.match(pattern);
    if (match) {
      quantity = parseFloat(match[1]);
      break;
    }
  }
  
  // If no quantity found, try to find standalone numbers (but exclude prices)
  if (!quantity) {
    // Remove customer and item names from text to find quantity
    let cleanText = text;
    if (bestCustomer) {
      cleanText = cleanText.replace(new RegExp(bestCustomer.name, 'gi'), '');
    }
    if (bestItem) {
      cleanText = cleanText.replace(new RegExp(bestItem.name, 'gi'), '');
    }
    
    const numberMatches = cleanText.match(/\b(\d+(?:\.\d+)?)\b/g);
    if (numberMatches) {
      // Filter out large numbers (likely prices) and take the smallest reasonable number
      const numbers = numberMatches.map(m => parseFloat(m)).filter(n => n > 0 && n < 10000);
      if (numbers.length > 0) {
        quantity = Math.min(...numbers);
      }
    }
  }
  
  // Calculate amount if product and quantity are found
  let amount: number | null = null;
  if (bestItem && quantity) {
    const itemPrice = bestItem.sellingPrice || bestItem.price || 0;
    if (itemPrice > 0) {
      amount = itemPrice * quantity;
    }
  }
  
  return {
    customerId: bestCustomer?.id || null,
    itemId: bestItem?.id || null,
    quantity: quantity,
    amount: amount,
  };
}

export default function VoiceInvoiceEntryPage() {
  const accountingContext = useContext(AccountingContext);
  const { toast } = useToast();
  const router = useRouter();
  const [user] = useAuthState(auth);
  
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [parsedData, setParsedData] = useState<{
    customerId: string | null;
    itemId: string | null;
    quantity: number | null;
    amount: number | null;
  } | null>(null);
  
  const customersQuery = user ? query(collection(db, 'customers'), where("userId", "==", user.uid)) : null;
  const [customersSnapshot, customersLoading] = useCollection(customersQuery);
  const customers = useMemo(() => customersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [customersSnapshot]);

  const itemsQuery = user ? query(collection(db, 'items'), where("userId", "==", user.uid)) : null;
  const [itemsSnapshot, itemsLoading] = useCollection(itemsQuery);
  const items = useMemo(() => itemsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [], [itemsSnapshot]);

  const form = useForm<VoiceInvoiceForm>({
    resolver: zodResolver(voiceInvoiceSchema),
    defaultValues: {
      customerId: "",
      invoiceNumber: "",
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      itemId: undefined,
      quantity: 1,
      amount: 0,
      taxRate: 18,
    },
  });

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if we're on HTTPS (required for speech recognition)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';

      if (!isSecure) {
        toast({
          variant: "destructive",
          title: "HTTPS Required",
          description: "Speech recognition requires a secure connection (HTTPS).",
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        try {
          const recognitionInstance = new SpeechRecognition();

          // Mobile-friendly settings
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = false; // Disable interim results for better mobile performance
          recognitionInstance.lang = 'en-US'; // Use US English for better mobile compatibility
          recognitionInstance.maxAlternatives = 1;

          recognitionInstance.onstart = () => {
            console.log('Speech recognition started');
            setIsListening(true);
          };

          recognitionInstance.onresult = (event: any) => {
            try {
              const result = event.results[0];
              if (result && result[0]) {
                const transcript = result[0].transcript.trim();
                console.log('Speech recognition result:', transcript);
                setTranscript(transcript);

                // Auto-stop after successful recognition
                setTimeout(() => {
                  setIsListening(false);
                }, 500);
              }
            } catch (error) {
              console.error('Error processing speech result:', error);
            }
          };

          recognitionInstance.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error, event);

            let errorMessage = "An error occurred with speech recognition.";
            let errorTitle = "Speech Recognition Error";

            switch (event.error) {
              case 'no-speech':
                errorMessage = "No speech detected. Please speak clearly and try again.";
                break;
              case 'audio-capture':
                errorMessage = "No microphone found. Please check your microphone settings.";
                break;
              case 'not-allowed':
                errorMessage = "Microphone access denied. Please allow microphone access and try again.";
                errorTitle = "Permission Denied";
                break;
              case 'network':
                errorMessage = "Network error occurred. Please check your connection.";
                break;
              case 'service-not-allowed':
                errorMessage = "Speech recognition service not available. Please try again later.";
                break;
              case 'bad-grammar':
                errorMessage = "Speech recognition grammar error. Please try again.";
                break;
              case 'language-not-supported':
                errorMessage = "The selected language is not supported.";
                break;
              default:
                errorMessage = `Speech recognition error: ${event.error}. Please try again.`;
            }

            setIsListening(false);
            toast({
              variant: "destructive",
              title: errorTitle,
              description: errorMessage,
            });
          };

          recognitionInstance.onend = () => {
            console.log('Speech recognition ended');
            setIsListening(false);
          };

          // Check if microphone permission is available
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
              .then(() => {
                console.log('Microphone permission granted');
                setRecognition(recognitionInstance);
              })
              .catch((error) => {
                console.error('Microphone permission denied:', error);
                toast({
                  variant: "destructive",
                  title: "Microphone Access Required",
                  description: "Please allow microphone access to use voice-to-invoice feature.",
                });
              });
          } else {
            // Fallback for older browsers
            setRecognition(recognitionInstance);
          }

        } catch (error) {
          console.error('Error initializing speech recognition:', error);
          toast({
            variant: "destructive",
            title: "Speech Recognition Unavailable",
            description: "Speech recognition could not be initialized. Please try a different browser.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Browser Not Supported",
          description: "Your browser does not support speech recognition. Please use Chrome, Safari, or Edge on mobile.",
        });
      }
    }

    // Cleanup function
    return () => {
      if (recognition) {
        try {
          recognition.stop();
          recognition.abort();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognition && isListening) {
        try {
          recognition.stop();
          recognition.abort();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, [recognition, isListening]);

  const startListening = () => {
    if (!recognition) {
      toast({
        variant: "destructive",
        title: "Speech Recognition Not Available",
        description: "Speech recognition is not available in your browser. Please use Chrome, Safari, or Edge.",
      });
      return;
    }

    // Check if already listening
    if (isListening) {
      console.log('Already listening, stopping first');
      stopListening();
      return;
    }

    setTranscript("");
    setParsedData(null);
    setIsListening(true);

    try {
      // Stop any existing recognition first
      recognition.abort();

      // Small delay for mobile devices
      setTimeout(() => {
        try {
          recognition.start();
          console.log('Speech recognition started successfully');
          toast({
            title: "🎤 Listening...",
            description: "Speak clearly: 'Customer name, Product name, Quantity'",
          });
        } catch (error) {
          console.error('Error starting recognition after delay:', error);
          setIsListening(false);
          toast({
            variant: "destructive",
            title: "Speech Recognition Failed",
            description: "Could not start speech recognition. Please try again.",
          });
        }
      }, 100);

    } catch (error) {
      console.error('Error starting recognition:', error);
      setIsListening(false);

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.name === 'InvalidStateError') {
          toast({
            variant: "destructive",
            title: "Recognition Busy",
            description: "Speech recognition is already running. Please wait.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Speech Recognition Error",
            description: error.message || "Failed to start speech recognition.",
          });
        }
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      try {
        recognition.stop();
        console.log('Speech recognition stopped');
      } catch (error) {
        console.error('Error stopping recognition:', error);
        // Force stop listening state
        recognition.abort();
      }
    }
    setIsListening(false);
  };

  const processVoiceInput = useCallback(() => {
    if (!transcript.trim()) {
      toast({
        variant: "destructive",
        title: "No Input",
        description: "Please speak to create an invoice.",
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Parse the voice input
    const parsed = parseVoiceInput(transcript, customers, items);
    setParsedData(parsed);
    
    // Auto-fill form
    if (parsed.customerId) {
      form.setValue("customerId", parsed.customerId);
    }
    
    if (parsed.itemId) {
      form.setValue("itemId", parsed.itemId);
      
      // Get item details
      const selectedItem = items.find((i: any) => i.id === parsed.itemId);
      if (selectedItem) {
        const itemPrice = selectedItem.sellingPrice || selectedItem.price || 0;
        const quantity = parsed.quantity || 1;
        const subtotal = itemPrice * quantity;
        const taxRate = form.getValues("taxRate") || 18;
        const tax = subtotal * (taxRate / 100);
        const totalAmount = subtotal + tax;
        
        form.setValue("quantity", quantity);
        form.setValue("amount", totalAmount);
      }
    } else if (parsed.amount) {
      form.setValue("amount", parsed.amount);
    }
    
    if (parsed.quantity && !parsed.itemId) {
      form.setValue("quantity", parsed.quantity);
    }
    
    setIsProcessing(false);
    
    toast({
      title: "Voice Input Processed",
      description: parsed.customerId && parsed.itemId 
        ? "Customer and product identified. Please review and create invoice."
        : "Some information may need manual entry. Please review.",
    });
  }, [transcript, customers, items, form, toast]);

  const handleSave = useCallback(async (values: VoiceInvoiceForm, closeOnSave: boolean) => {
    if (!accountingContext) return;
    const { addJournalVoucher } = accountingContext;

    const selectedCustomer = customers.find(c => c.id === values.customerId);

    if (!selectedCustomer) {
        toast({ variant: "destructive", title: "Invalid Selection", description: "Please ensure a customer is selected." });
        return;
    }
    
    // Validate amount
    if (!values.amount || values.amount <= 0) {
        toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid amount greater than zero." });
        return;
    }
    
    const invoiceId = `INV-${values.invoiceNumber}`;
    const subtotal = values.amount / (1 + values.taxRate / 100);
    const totalTax = values.amount - subtotal;
    
    // Use accountCode if available, otherwise fall back to Firebase ID
    const customerAccountCode = selectedCustomer.accountCode || selectedCustomer.id;
    
    // Get selected item if provided
    const selectedItem = values.itemId ? items.find((i: any) => i.id === values.itemId) : null;
    const itemDescription = selectedItem 
      ? `${selectedItem.name}${values.quantity && values.quantity > 1 ? ` (Qty: ${values.quantity})` : ''}`
      : "Goods/Services";
    
    // Use account code 4010 for Sales Revenue (GSTR-1 requirement)
    const journalLines = [
        { account: customerAccountCode, debit: values.amount.toFixed(2), credit: '0' },
        { account: '4010', debit: '0', credit: subtotal.toFixed(2) }, // Sales Revenue - must be 4010 for GSTR-1
        { account: '2110', debit: '0', credit: totalTax.toFixed(2) } // GST Payable
    ];
    const narration = `Sale of ${itemDescription} to ${selectedCustomer.name}`;

    try {
        const newInvoice: any = {
            id: invoiceId,
            date: values.invoiceDate,
            narration,
            lines: journalLines,
            amount: values.amount,
            customerId: values.customerId,
        };

        await addJournalVoucher(newInvoice);

        toast({ 
          title: "Invoice Created!", 
          description: `${invoiceId} has been created successfully and will appear in GSTR-1 and GSTR-3B.` 
        });

        // Reset form and transcript
        setTranscript("");
        setParsedData(null);
        const currentInvoiceNumber = parseInt(values.invoiceNumber.replace(/[^0-9]/g, ''), 10);
        const nextInvoiceNumber = isNaN(currentInvoiceNumber) ? "" : String(currentInvoiceNumber + 1).padStart(3, '0');

        if (closeOnSave) {
            router.push("/billing/invoices");
        } else {
            form.reset({
                customerId: "",
                invoiceNumber: nextInvoiceNumber,
                invoiceDate: format(new Date(), "yyyy-MM-dd"),
                itemId: undefined,
                quantity: 1,
                amount: 0,
                taxRate: 18,
            });
            form.setFocus("customerId");
        }
    } catch (e: any) {
        console.error("Error creating invoice:", e);
        toast({ 
          variant: "destructive", 
          title: "Failed to save invoice", 
          description: e.message || "An error occurred while creating the invoice. Please try again." 
        });
    }
  }, [accountingContext, customers, items, toast, router, form]);

  const onSaveAndNew = form.handleSubmit(values => handleSave(values, false));
  const onSaveAndClose = form.handleSubmit(values => handleSave(values, true));

  // Auto-generate invoice number
  useEffect(() => {
    const journalVouchers = accountingContext?.journalVouchers || [];
    const invoices = journalVouchers.filter((v: any) => v && v.id && v.id.startsWith("INV-"));
    const lastInvoice = invoices[invoices.length - 1];
    
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.id.replace("INV-", "").replace(/[^0-9]/g, ''), 10);
      const nextNumber = isNaN(lastNumber) ? "001" : String(lastNumber + 1).padStart(3, '0');
      form.setValue("invoiceNumber", nextNumber);
    } else {
      form.setValue("invoiceNumber", "001");
    }
  }, [accountingContext, form]);

  const selectedCustomer = customers.find((c: any) => c.id === form.watch("customerId"));
  const selectedItem = items.find((i: any) => i.id === form.watch("itemId"));

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/billing/invoices" passHref>
        <Button variant="outline" size="icon">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Mic className="text-primary"/> Voice-to-Invoice
        </h1>
        <p className="text-muted-foreground">Create invoices using voice commands. Perfect for mobile users!</p>
      </div>

      {/* Important Alert */}
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Important: Prerequisites Required</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Before using this voice-to-invoice feature, make sure that Customer and Item have been already created in the application.
          If not, create customer and items for one time to ensure voice recognition works properly.
        </AlertDescription>
      </Alert>

      {/* Voice Input Section */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="text-primary" />
            Voice Input
          </CardTitle>
          <CardDescription>
            Click the microphone button and speak naturally. Try these examples:
            <br />
            • "Create invoice for ABC Company, Product XYZ, quantity 5"
            <br />
            • "Invoice ABC Company for Product XYZ, 5 pieces"
            <br />
            • "ABC Company, Product XYZ, 5 units"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="lg"
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || !recognition}
              className={`w-24 h-24 rounded-full touch-manipulation ${isListening ? 'bg-destructive hover:bg-destructive/90 animate-pulse shadow-lg' : 'bg-primary hover:bg-primary/90 shadow-md'} sm:w-20 sm:h-20`}
            >
              {isListening ? (
                <MicOff className="h-10 w-10 sm:h-8 sm:w-8" />
              ) : (
                <Mic className="h-10 w-10 sm:h-8 sm:w-8" />
              )}
            </Button>
            <div className="flex-1 w-full sm:w-auto">
              {isListening && (
                <Alert className="w-full">
                  <AlertTitle className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 animate-pulse" />
                    Listening...
                  </AlertTitle>
                  <AlertDescription>Speak clearly: "Customer name, Product name, Quantity". Tap the microphone to stop.</AlertDescription>
                </Alert>
              )}
              {transcript && !isListening && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recognized Text:</p>
                  <p className="text-sm p-3 bg-muted rounded-md">{transcript}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={processVoiceInput}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Process Voice Input
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Parsed Data Display */}
          {parsedData && (
            <div className="space-y-2 p-4 bg-muted/50 rounded-md">
              <p className="text-sm font-medium">Parsed Information:</p>
              <div className="flex flex-wrap gap-2">
                {parsedData.customerId && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Customer: {customers.find((c: any) => c.id === parsedData.customerId)?.name}
                  </Badge>
                )}
                {parsedData.itemId && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Product: {items.find((i: any) => i.id === parsedData.itemId)?.name}
                  </Badge>
                )}
                {parsedData.quantity && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Quantity: {parsedData.quantity}
                  </Badge>
                )}
                {parsedData.amount && (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Amount: ₹{parsedData.amount.toFixed(2)}
                  </Badge>
                )}
                {!parsedData.customerId && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Customer not found
                  </Badge>
                )}
                {!parsedData.itemId && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Product not found
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Form */}
      <Form {...form}>
        <form>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
              <CardDescription>
                Review and edit the invoice details. Voice input will auto-fill these fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="customerId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={customersLoading ? "Loading..." : "Select Customer"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="invoiceDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <FormField control={form.control} name="itemId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product/Item (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value || undefined);
                        // Auto-calculate amount when product is selected
                        const selectedItem = items.find((i: any) => i.id === value);
                        if (selectedItem) {
                          const itemPrice = selectedItem.sellingPrice || selectedItem.price || 0;
                          const quantity = form.getValues("quantity") || 1;
                          const subtotal = itemPrice * quantity;
                          const taxRate = form.getValues("taxRate") || 18;
                          const tax = subtotal * (taxRate / 100);
                          const totalAmount = subtotal + tax;
                          form.setValue("amount", totalAmount);
                        }
                      }}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={itemsLoading ? "Loading..." : "Select Product (Optional)"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.map((i: any) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name} {i.sellingPrice || i.price ? `(₹${(i.sellingPrice || i.price).toFixed(2)})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-calculate amount when quantity changes
                          const selectedItem = items.find((i: any) => i.id === form.getValues("itemId"));
                          if (selectedItem) {
                            const itemPrice = selectedItem.sellingPrice || selectedItem.price || 0;
                            const quantity = parseFloat(e.target.value) || 1;
                            const subtotal = itemPrice * quantity;
                            const taxRate = form.getValues("taxRate") || 18;
                            const tax = subtotal * (taxRate / 100);
                            const totalAmount = subtotal + tax;
                            form.setValue("amount", totalAmount);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5900" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="taxRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="18" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-calculate amount when tax rate changes
                          const selectedItem = items.find((i: any) => i.id === form.getValues("itemId"));
                          if (selectedItem) {
                            const itemPrice = selectedItem.sellingPrice || selectedItem.price || 0;
                            const quantity = form.getValues("quantity") || 1;
                            const subtotal = itemPrice * quantity;
                            const taxRate = parseFloat(e.target.value) || 18;
                            const tax = subtotal * (taxRate / 100);
                            const totalAmount = subtotal + tax;
                            form.setValue("amount", totalAmount);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                {selectedItem && (
                  <div className="flex items-end">
                    <div className="w-full p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">Unit Price</p>
                      <p className="text-lg font-semibold">
                        ₹{(selectedItem.sellingPrice || selectedItem.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onSaveAndClose}>
                Save & Close
              </Button>
              <Button type="button" onClick={onSaveAndNew}>
                <Save className="mr-2"/>
                Save & New
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}

