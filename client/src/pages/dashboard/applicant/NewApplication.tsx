import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, User } from "lucide-react";

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

  const { data: profile, isLoading: profileLoading } = useQuery<any>({
    queryKey: ["/api/profile"],
  });

  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const profileComplete = isProfileComplete(profile);
  const selectedPackage = packages?.find((p) => p.id === selectedPackageId);
  const fullName = [profile?.firstName, profile?.middleName, profile?.lastName].filter(Boolean).join(" ");

  const createApplication = useMutation({
    mutationFn: async () => {
      const formData: Record<string, any> = {
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
      const response = await apiRequest("POST", "/api/applications", {
        packageId: selectedPackageId,
        formData,
        autoSendToDoctor: true,
      });
      return response.json();
    },
    onSuccess: (application) => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Order Submitted!",
        description: "Your doctor's note request has been submitted and sent for review.",
      });
      setLocation(`/dashboard/applicant`);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

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
    createApplication.mutate();
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
          <Card data-testid="step-confirmation">
            <CardHeader>
              <CardTitle>Review & Confirm</CardTitle>
              <CardDescription>
                Please review your order before submitting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPackage && (
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium mb-1">Selected Note Type</p>
                  <p className="text-lg font-bold" data-testid="text-selected-package">{selectedPackage.name}</p>
                  <p className="text-2xl font-bold text-primary mt-2">
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
                    return (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground">{fieldDef?.label || key}</p>
                        <p className="text-sm">{value}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              <Alert className="border-blue-500/50 bg-blue-500/10">
                <AlertDescription className="text-blue-700 dark:text-blue-400 text-sm">
                  After submitting, your application will be automatically sent to a licensed physician for review. You will be notified when a decision is made.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
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
              disabled={createApplication.isPending}
              data-testid="button-submit-application"
            >
              {createApplication.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
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
