import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Loader2, Save, ShoppingCart, CheckCircle2, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
];

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional(),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  medicalCondition: z.string().optional(),
  driverLicenseNumber: z.string().optional(),
  hasMedicare: z.boolean().default(false),
  ssn: z.string().optional(),
  isVeteran: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
  chargeUnderstanding: z.boolean().default(false),
  patientAuthorization: z.boolean().default(false),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

function isProfileComplete(data: Partial<RegistrationFormData>): boolean {
  const requiredFields: (keyof RegistrationFormData)[] = [
    "firstName", "lastName", "email", "phone",
    "dateOfBirth", "address", "city", "state", "zipCode",
  ];
  const requiredConsents: (keyof RegistrationFormData)[] = [
    "smsConsent", "emailConsent", "chargeUnderstanding", "patientAuthorization",
  ];

  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === "string" && !(data[field] as string).trim())) {
      return false;
    }
  }
  for (const consent of requiredConsents) {
    if (!data[consent]) {
      return false;
    }
  }
  return true;
}

export default function RegistrationPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: isLoadingProfile } = useQuery<Record<string, any>>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      medicalCondition: "",
      driverLicenseNumber: "",
      hasMedicare: false,
      ssn: "",
      isVeteran: false,
      smsConsent: false,
      emailConsent: false,
      chargeUnderstanding: false,
      patientAuthorization: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        firstName: profile.firstName || "",
        middleName: profile.middleName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        dateOfBirth: profile.dateOfBirth || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        medicalCondition: profile.medicalCondition || "",
        driverLicenseNumber: profile.driverLicenseNumber || "",
        hasMedicare: profile.hasMedicare || false,
        ssn: profile.ssn || "",
        isVeteran: profile.isVeteran || false,
        smsConsent: profile.smsConsent || false,
        emailConsent: profile.emailConsent || false,
        chargeUnderstanding: profile.chargeUnderstanding || false,
        patientAuthorization: profile.patientAuthorization || false,
      });
    }
  }, [profile, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const res = await apiRequest("PUT", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      refreshUser();
      toast({
        title: "Profile Saved",
        description: "Your profile information has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save profile.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    saveMutation.mutate(data);
  };

  const watchedValues = form.watch();
  const profileComplete = isProfileComplete(watchedValues);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-registration-title">
              My Profile
            </h1>
            <p className="text-muted-foreground">
              Review and update your personal details
            </p>
          </div>
          <Link href="/packages">
            <Button disabled={!profileComplete} data-testid="button-buy-package">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Order Doctor's Note
            </Button>
          </Link>
        </div>

        {isLoadingProfile ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            {profileComplete ? (
              <Alert data-testid="alert-profile-complete" className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">Profile Complete</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Your profile is complete. You can now apply for a doctor's note.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert data-testid="alert-profile-incomplete" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">Profile Incomplete</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  Please complete all required fields and consent checkboxes before applying for a doctor's note.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Your account login details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormDescription>Please ensure you have personal access to this email.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>This information will be used on your doctor's notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input data-testid="input-first-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name (Optional)</FormLabel>
                            <FormControl>
                              <Input data-testid="input-middle-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input data-testid="input-last-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="(555) 555-5555" data-testid="input-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-dob" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Address Information</CardTitle>
                    <CardDescription>
                      Please verify your address does not have a P.O. Box. This information will be used on your doctor's notes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your street address" data-testid="input-address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your city" data-testid="input-city" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-state">
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {US_STATES.map((state) => (
                                  <SelectItem key={state} value={state}>{state}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP Code</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your ZIP code" data-testid="input-zip" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Medical Information (Optional)</CardTitle>
                    <CardDescription>
                      This is optional. You can provide this information now or update it later in your profile.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="medicalCondition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Condition or Reason for Visit</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="E.g., Chronic pain, anxiety, insomnia... (optional)"
                              data-testid="input-medical-condition"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="driverLicenseNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Driver's License Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your driver's license number" data-testid="input-driver-license" {...field} />
                          </FormControl>
                          <FormDescription>Some states require this for verification.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasMedicare"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-medicare"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Do you have Medicare/Medicaid?</FormLabel>
                            <FormDescription>
                              This helps us provide you with information about potential cost savings.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ssn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Social Security Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="XXX-XX-XXXX" data-testid="input-ssn" {...field} />
                          </FormControl>
                          <FormDescription>Some states require this information for the application process.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isVeteran"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-veteran"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Disabled Veteran</FormLabel>
                            <FormDescription>
                              Check this box if you are a disabled veteran. This may help us provide you with special considerations.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Communication Consent</CardTitle>
                    <CardDescription>Required consents for processing your order</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="smsConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-sms-consent"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>SMS/Text Message Consent</FormLabel>
                            <FormDescription>
                              I consent to receive text messages for appointment reminders, consultation notifications, and account updates.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emailConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-email-consent"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Email Communication Consent</FormLabel>
                            <FormDescription>
                              I consent to receive emails for appointment notifications, account updates, service announcements, and related communications.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="chargeUnderstanding"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-charge-understanding"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Charge Understanding</FormLabel>
                            <FormDescription>
                              I understand the charge name that will appear on my bank statement and that disputed charges may delay my order.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="patientAuthorization"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-patient-auth"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Patient Authorization</FormLabel>
                            <FormDescription>
                              I authorize the platform and its staff to access my information to assist with processing my order.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                  <Button type="submit" disabled={saveMutation.isPending} data-testid="button-save-registration">
                    {saveMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
