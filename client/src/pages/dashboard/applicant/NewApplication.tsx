import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Package } from "@shared/schema";
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, User, Lock } from "lucide-react";

function isProfileComplete(data: any): boolean {
  return !!(
    data?.firstName &&
    data?.lastName &&
    data?.phone &&
    data?.dateOfBirth &&
    data?.address &&
    data?.city &&
    data?.state &&
    data?.zipCode &&
    data?.smsConsent &&
    data?.emailConsent &&
    data?.chargeUnderstanding &&
    data?.patientAuthorization
  );
}

export default function NewApplication() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const preselectedPackage = params.get("package") || "";

  const [step, setStep] = useState(1);
  const [selectedPackageId, setSelectedPackageId] = useState(preselectedPackage);
  const [reason, setReason] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const totalSteps = 3;

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpMonth, setCardExpMonth] = useState("");
  const [cardExpYear, setCardExpYear] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [acceptJsReady, setAcceptJsReady] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const { data: paymentConfig } = useQuery<{
    configured: boolean;
    acceptJsUrl: string;
    apiLoginId: string;
    clientKey: string;
  }>({
    queryKey: ["/api/payment/config"],
  });

  const { data: draftData } = useQuery<{ draftFormData: Record<string, any> }>({
    queryKey: ["/api/profile/draft-form"],
  });

  const draftLoaded = useRef(false);
  useEffect(() => {
    if (draftData?.draftFormData && !draftLoaded.current) {
      draftLoaded.current = true;
      const draft = draftData.draftFormData;
      if (draft.packageId && !preselectedPackage) setSelectedPackageId(draft.packageId);
      if (draft.reason) setReason(draft.reason);
      if (draft.additionalInfo) setAdditionalInfo(draft.additionalInfo);
      if (draft.customFields) setCustomFields(draft.customFields);
      if (draft.step && draft.step > 1) setStep(draft.step);
    }
  }, [draftData]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveDraft = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const draftFormData = {
        packageId: selectedPackageId,
        reason,
        additionalInfo,
        customFields,
        step,
      };
      apiRequest("PUT", "/api/profile/draft-form", { draftFormData }).catch(() => {});
    }, 1000);
  }, [selectedPackageId, reason, additionalInfo, customFields, step]);

  useEffect(() => {
    if (draftLoaded.current) saveDraft();
  }, [selectedPackageId, reason, additionalInfo, customFields, step, saveDraft]);

  useEffect(() => {
    if (paymentConfig?.acceptJsUrl) {
      const existing = document.querySelector(`script[src="${paymentConfig.acceptJsUrl}"]`);
      if (existing) {
        if ((window as any).Accept) setAcceptJsReady(true);
        return;
      }
      const script = document.createElement("script");
      script.src = paymentConfig.acceptJsUrl;
      script.charset = "utf-8";
      script.onload = () => setAcceptJsReady(true);
      document.head.appendChild(script);
    }
  }, [paymentConfig?.acceptJsUrl]);

  const profileComplete = isProfileComplete(profile);
  const selectedPackage = packages?.find((p) => p.id === selectedPackageId);
  const fullName = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(" ");

  const buildFormData = () => {
    return {
      ...customFields,
      fullName,
      firstName: profile?.firstName,
      middleName: profile?.middleName,
      lastName: profile?.lastName,
      email: profile?.email,
      phone: profile?.phone,
      dateOfBirth: profile?.dateOfBirth,
      address: profile?.address,
      city: profile?.city,
      state: profile?.state,
      zipCode: profile?.zipCode,
      driverLicenseNumber: profile?.driverLicenseNumber,
      medicalCondition: profile?.medicalCondition,
      ssn: profile?.ssn,
      hasMedicare: profile?.hasMedicare,
      isVeteran: profile?.isVeteran,
      reason,
      additionalInfo,
    };
  };

  const processPayment = async () => {
    if (!paymentConfig?.configured) {
      setPaymentProcessing(true);
      setPaymentError("");
      try {
        const formData = buildFormData();
        const res = await apiRequest("POST", "/api/applications", {
          packageId: selectedPackageId,
          formData,
          autoSendToDoctor: true,
        });
        const result = await res.json();
        queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
        apiRequest("PUT", "/api/profile/draft-form", { draftFormData: {} }).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["/api/profile/draft-form"] });
        toast({
          title: "Order Submitted!",
          description: "Your doctor's note request has been submitted and sent for review.",
        });
        setLocation("/dashboard/applicant");
      } catch (error: any) {
        setPaymentError(error.message || "Submission failed");
        toast({ title: "Submission Failed", description: error.message, variant: "destructive" });
      } finally {
        setPaymentProcessing(false);
      }
      return;
    }

    if (!cardNumber || !cardExpMonth || !cardExpYear || !cardCvv) {
      setPaymentError("Please fill in all card fields");
      return;
    }

    setPaymentProcessing(true);
    setPaymentError("");

    try {
      const Accept = (window as any).Accept;
      if (!Accept) {
        throw new Error("Payment system is loading. Please wait a moment and try again.");
      }

      const secureData = {
        authData: {
          clientKey: paymentConfig?.clientKey || "",
          apiLoginID: paymentConfig?.apiLoginId || "",
        },
        cardData: {
          cardNumber: cardNumber.replace(/\s/g, ""),
          month: cardExpMonth.padStart(2, "0"),
          year: cardExpYear.length === 2 ? "20" + cardExpYear : cardExpYear,
          cardCode: cardCvv,
        },
      };

      const opaqueData = await new Promise<{ dataDescriptor: string; dataValue: string }>((resolve, reject) => {
        Accept.dispatchData(secureData, (response: any) => {
          if (response.opaqueData) {
            resolve(response.opaqueData);
          } else {
            const errorMsg = response.messages?.message?.[0]?.text || "Card validation failed";
            reject(new Error(errorMsg));
          }
        });
      });

      const formData = buildFormData();
      const res = await apiRequest("POST", "/api/payment/charge", {
        opaqueDataDescriptor: opaqueData.dataDescriptor,
        opaqueDataValue: opaqueData.dataValue,
        packageId: selectedPackageId,
        formData,
      });
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.message || "Payment failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      apiRequest("PUT", "/api/profile/draft-form", { draftFormData: {} }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["/api/profile/draft-form"] });
      toast({
        title: "Payment Successful!",
        description: "Your application has been submitted and is being processed.",
      });
      setLocation("/dashboard/applicant");
    } catch (error: any) {
      setPaymentError(error.message || "Payment processing failed");
      toast({
        title: "Payment Failed",
        description: error.message || "Please check your card details and try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentProcessing(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !selectedPackageId) {
      toast({ title: "Please select a note type", variant: "destructive" });
      return;
    }
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (!reason || reason.length < 10) {
      toast({ title: "Please provide more details about the purpose of this note", variant: "destructive" });
      return;
    }
    processPayment();
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profileComplete) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Please complete your profile before ordering a doctor's note.
            </AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Complete Your Profile First</CardTitle>
              <CardDescription>
                Your profile information will be used on your medical forms and doctor's note application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/applicant/registration">
                <Button className="w-full" data-testid="button-complete-profile">
                  <User className="mr-2 h-4 w-4" />
                  Complete My Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const packageFormFields = Array.isArray((selectedPackage as any)?.formFields) ? (selectedPackage as any).formFields : [];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/applicant">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-new-app-title">
              Order Doctor's Note
            </h1>
            <p className="text-muted-foreground">
              Step {step} of {totalSteps}
            </p>
          </div>
        </div>

        <Progress value={(step / totalSteps) * 100} className="h-2" />

        {step === 1 && (
          <Card data-testid="step-package-selection">
            <CardHeader>
              <CardTitle>Select Note Type</CardTitle>
              <CardDescription>
                Choose the type of doctor's note you need
              </CardDescription>
            </CardHeader>
            <CardContent>
              {packagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (
                <RadioGroup
                  onValueChange={setSelectedPackageId}
                  value={selectedPackageId}
                  className="space-y-3"
                >
                  {packages?.map((pkg) => (
                    <div key={pkg.id}>
                      <RadioGroupItem
                        value={pkg.id}
                        id={pkg.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={pkg.id}
                        className="flex items-center justify-between p-4 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover-elevate transition-all"
                        data-testid={`package-option-${pkg.id}`}
                      >
                        <div>
                          <p className="font-semibold">{pkg.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {pkg.description}
                          </p>
                        </div>
                        <div className="text-xl font-bold text-primary">
                          ${(Number(pkg.price) / 100).toFixed(2)}
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <Card data-testid="step-review-info">
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>
                  This information is pulled from your profile and will be used on your application
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                    <p className="font-medium" data-testid="text-profile-name">{fullName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="font-medium" data-testid="text-profile-email">{profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="font-medium" data-testid="text-profile-phone">{profile?.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="font-medium" data-testid="text-profile-dob">{profile?.dateOfBirth}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="font-medium" data-testid="text-profile-address">
                      {profile?.address}, {profile?.city}, {profile?.state} {profile?.zipCode}
                    </p>
                  </div>
                  {profile?.driverLicenseNumber && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Driver's License</p>
                      <p className="font-medium">{profile.driverLicenseNumber}</p>
                    </div>
                  )}
                  {profile?.medicalCondition && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">Medical Condition</p>
                      <p className="font-medium">{profile.medicalCondition}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link href="/dashboard/applicant/registration">
                    <Button variant="outline" size="sm" type="button" data-testid="button-edit-profile">Edit Profile Information</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="step-note-details">
              <CardHeader>
                <CardTitle>Note Details</CardTitle>
                <CardDescription>
                  Provide details about why you need this doctor's note
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Purpose of Note <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="What do you need this doctor's note for? (e.g., work absence, school excuse, etc.)"
                    className="min-h-[120px] mt-1"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    data-testid="input-reason"
                  />
                </div>

                <div>
                  <Label>Additional Information (Optional)</Label>
                  <Textarea
                    placeholder="Any other details you'd like to share..."
                    className="min-h-[80px] mt-1"
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    data-testid="input-additional"
                  />
                </div>

                {packageFormFields.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Additional Required Information</p>
                    {packageFormFields.map((field: any, idx: number) => (
                      <div key={field.name || idx}>
                        <Label>
                          {field.label || field.name}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.type === "textarea" ? (
                          <Textarea
                            className="mt-1"
                            value={customFields[field.name] || ""}
                            onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.target.value })}
                            data-testid={`input-custom-${field.name}`}
                          />
                        ) : field.type === "radio" ? (
                          <div className="space-y-2 pt-1" data-testid={`radio-group-${field.name}`}>
                            {field.radioOptions && field.radioOptions.length > 0 ? (
                              field.radioOptions.map((ro: any) => (
                                <label
                                  key={ro.radioId}
                                  className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${customFields[field.name] === ro.radioId ? "border-primary bg-primary/5" : ""}`}
                                  data-testid={`radio-label-${field.name}-${ro.radioId}`}
                                >
                                  <input
                                    type="radio"
                                    name={field.name}
                                    value={ro.radioId}
                                    checked={customFields[field.name] === ro.radioId}
                                    onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.target.value })}
                                    className="h-4 w-4 text-primary"
                                    data-testid={`radio-${field.name}-${ro.radioId}`}
                                  />
                                  <span className="text-sm">{ro.text}</span>
                                </label>
                              ))
                            ) : (field.options || []).map((opt: string) => (
                              <label
                                key={opt}
                                className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${customFields[field.name] === opt ? "border-primary bg-primary/5" : ""}`}
                                data-testid={`radio-label-${field.name}-${opt.toLowerCase().replace(/\s+/g, "_")}`}
                              >
                                <input
                                  type="radio"
                                  name={field.name}
                                  value={opt}
                                  checked={customFields[field.name] === opt}
                                  onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.target.value })}
                                  className="h-4 w-4 text-primary"
                                  data-testid={`radio-${field.name}-${opt.toLowerCase().replace(/\s+/g, "_")}`}
                                />
                                <span className="text-sm">{opt}</span>
                              </label>
                            ))}
                          </div>
                        ) : field.type === "select" ? (
                          <Select
                            value={customFields[field.name] || ""}
                            onValueChange={(value) => setCustomFields({ ...customFields, [field.name]: value })}
                          >
                            <SelectTrigger className="mt-1" data-testid={`select-custom-${field.name}`}>
                              <SelectValue placeholder={`Select ${field.label || field.name}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {(field.options || []).map((opt: string) => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type={field.type === "phone" ? "tel" : field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                            className="mt-1"
                            value={customFields[field.name] || ""}
                            onChange={(e) => setCustomFields({ ...customFields, [field.name]: e.target.value })}
                            data-testid={`input-custom-${field.name}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Card data-testid="step-review-submit">
              <CardHeader>
                <CardTitle>Review Your Order</CardTitle>
                <CardDescription>Verify your information before payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPackage && (
                  <div className="p-4 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Selected Note Type</p>
                    <p className="text-lg font-bold" data-testid="text-selected-package">{selectedPackage.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{selectedPackage.description}</p>
                    <p className="text-2xl font-bold text-primary mt-2" data-testid="text-selected-price">
                      ${(Number(selectedPackage.price) / 100).toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="p-4 rounded-lg border space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Patient</p>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email} | {profile?.phone}</p>
                  <p className="text-sm text-muted-foreground">{profile?.address}, {profile?.city}, {profile?.state} {profile?.zipCode}</p>
                </div>

                <div className="p-4 rounded-lg border space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Purpose</p>
                  <p data-testid="text-reason">{reason}</p>
                  {additionalInfo && (
                    <>
                      <p className="text-sm font-medium text-muted-foreground mt-2">Additional Info</p>
                      <p>{additionalInfo}</p>
                    </>
                  )}
                </div>

                {Object.keys(customFields).length > 0 && (
                  <div className="p-4 rounded-lg border space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Additional Details</p>
                    {Object.entries(customFields).filter(([_, v]) => v).map(([key, value]) => {
                      const fieldDef = packageFormFields.find((f: any) => f.name === key);
                      const radioOpt = fieldDef?.radioOptions?.find((ro: any) => ro.radioId === value);
                      return (
                        <div key={key}>
                          <p className="text-xs text-muted-foreground">{fieldDef?.label || key}</p>
                          <p className="text-sm">{radioOpt?.text || value}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {paymentConfig?.configured && (
              <Card data-testid="step-payment">
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                  <CardDescription>Enter your card details to complete your order</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border bg-primary/5 text-center mb-4">
                    <p className="text-sm text-muted-foreground">Amount Due</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-payment-amount">
                      ${selectedPackage ? (Number(selectedPackage.price) / 100).toFixed(2) : "0.00"}
                    </p>
                  </div>

                  {paymentError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription data-testid="text-payment-error">{paymentError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="4111 1111 1111 1111"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/[^\d\s]/g, "").slice(0, 19))}
                      maxLength={19}
                      data-testid="input-card-number"
                      disabled={paymentProcessing}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expMonth">Month</Label>
                      <Select value={cardExpMonth} onValueChange={setCardExpMonth} disabled={paymentProcessing}>
                        <SelectTrigger data-testid="select-exp-month">
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => {
                            const m = String(i + 1).padStart(2, "0");
                            return <SelectItem key={m} value={m}>{m}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expYear">Year</Label>
                      <Select value={cardExpYear} onValueChange={setCardExpYear} disabled={paymentProcessing}>
                        <SelectTrigger data-testid="select-exp-year">
                          <SelectValue placeholder="YYYY" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const y = String(new Date().getFullYear() + i);
                            return <SelectItem key={y} value={y}>{y}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        maxLength={4}
                        data-testid="input-cvv"
                        disabled={paymentProcessing}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                    <Lock className="h-3.5 w-3.5" />
                    Your payment is processed securely through Authorize.Net. Card details are never stored on our servers.
                  </div>
                </CardContent>
              </Card>
            )}

            {!paymentConfig?.configured && paymentError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription data-testid="text-payment-error">{paymentError}</AlertDescription>
              </Alert>
            )}

            <Alert className="border-blue-500/50 bg-blue-500/10">
              <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
                After submitting, your application will be automatically sent to a licensed physician for review. You will be notified when a decision is made.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <div className="flex justify-between mt-6">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={prevStep} data-testid="button-prev-step">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/applicant">Cancel</Link>
            </Button>
          )}

          {step < totalSteps ? (
            <Button type="button" onClick={nextStep} data-testid="button-next-step">
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={paymentProcessing || (paymentConfig?.configured && !acceptJsReady)}
              data-testid="button-submit-application"
            >
              {paymentProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : paymentConfig?.configured && !acceptJsReady ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Payment...
                </>
              ) : paymentConfig?.configured ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Pay ${selectedPackage ? (Number(selectedPackage.price) / 100).toFixed(2) : "0.00"} & Submit
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit Order
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
