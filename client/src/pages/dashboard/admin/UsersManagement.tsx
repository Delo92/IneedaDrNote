import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { UserProfileModal } from "@/components/shared/UserProfileModal";
import { useAuth } from "@/contexts/AuthContext";
import { useConfig } from "@/contexts/ConfigContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Search, UserCog, UserPlus, Loader2, Stethoscope, FileText, Info, DollarSign } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
  userLevel: z.string().min(1, "Please select a role"),
  doctorFullName: z.string().optional(),
  doctorLicense: z.string().optional(),
  doctorNPI: z.string().optional(),
  doctorDEA: z.string().optional(),
  doctorPhone: z.string().optional(),
  doctorFax: z.string().optional(),
  doctorAddress: z.string().optional(),
  doctorSpecialty: z.string().optional(),
  doctorState: z.string().optional(),
  formTemplate: z.string().optional(),
});

type AddUserFormData = z.infer<typeof addUserSchema>;

const PLACEHOLDERS_REFERENCE = [
  { tag: "{{doctorName}}", desc: "Doctor's full name" },
  { tag: "{{doctorLicense}}", desc: "License number" },
  { tag: "{{doctorNPI}}", desc: "NPI number" },
  { tag: "{{doctorDEA}}", desc: "DEA number" },
  { tag: "{{doctorPhone}}", desc: "Doctor phone" },
  { tag: "{{doctorFax}}", desc: "Doctor fax" },
  { tag: "{{doctorAddress}}", desc: "Doctor address" },
  { tag: "{{doctorSpecialty}}", desc: "Doctor specialty" },
  { tag: "{{doctorState}}", desc: "Doctor state" },
  { tag: "{{patientName}}", desc: "Patient full name" },
  { tag: "{{patientFirstName}}", desc: "Patient first name" },
  { tag: "{{patientLastName}}", desc: "Patient last name" },
  { tag: "{{patientDOB}}", desc: "Date of birth" },
  { tag: "{{patientPhone}}", desc: "Patient phone" },
  { tag: "{{patientEmail}}", desc: "Patient email" },
  { tag: "{{patientAddress}}", desc: "Patient street" },
  { tag: "{{patientCity}}", desc: "Patient city" },
  { tag: "{{patientState}}", desc: "Patient state" },
  { tag: "{{patientZipCode}}", desc: "Patient zip" },
  { tag: "{{patientSSN}}", desc: "Patient SSN" },
  { tag: "{{patientDriverLicense}}", desc: "Driver license #" },
  { tag: "{{patientMedicalCondition}}", desc: "Medical condition" },
  { tag: "{{reason}}", desc: "Reason for note" },
  { tag: "{{packageName}}", desc: "Note type name" },
  { tag: "{{date}}", desc: "Today (long format)" },
  { tag: "{{dateShort}}", desc: "Today (short)" },
];

export default function UsersManagement() {
  const { user: currentUser } = useAuth();
  const { getLevelName } = useConfig();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState("account");
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [manualPaymentUser, setManualPaymentUser] = useState<User | null>(null);
  const [manualPaymentPackageId, setManualPaymentPackageId] = useState("");
  const [manualPaymentReason, setManualPaymentReason] = useState("");
  const [manualPaymentLoading, setManualPaymentLoading] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: packages } = useQuery<any[]>({
    queryKey: ["/api/packages"],
  });
  const activePackages = packages?.filter((p: any) => p.isActive) || [];

  const handleManualPayment = async () => {
    if (!manualPaymentUser || !manualPaymentPackageId) return;
    setManualPaymentLoading(true);
    try {
      const res = await apiRequest("POST", `/api/admin/users/${manualPaymentUser.id}/manual-payment`, {
        packageId: manualPaymentPackageId,
        reason: manualPaymentReason || "Manual payment by admin",
      });
      const data = await res.json();
      toast({
        title: "Manual Payment Processed",
        description: `Application created for ${manualPaymentUser.firstName} ${manualPaymentUser.lastName}. ${data.message || ""}`,
      });
      setManualPaymentUser(null);
      setManualPaymentPackageId("");
      setManualPaymentReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setManualPaymentLoading(false);
    }
  };

  const form = useForm<AddUserFormData>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      userLevel: "1",
      doctorFullName: "",
      doctorLicense: "",
      doctorNPI: "",
      doctorDEA: "",
      doctorPhone: "",
      doctorFax: "",
      doctorAddress: "",
      doctorSpecialty: "",
      doctorState: "",
      formTemplate: "",
    },
  });

  const watchedLevel = form.watch("userLevel");
  const isDoctor = watchedLevel === "2";

  useEffect(() => {
    if (!addDialogOpen) {
      setAddDialogTab("account");
      setShowPlaceholders(false);
    }
  }, [addDialogOpen]);

  const createUserMutation = useMutation({
    mutationFn: async (data: AddUserFormData) => {
      const payload: Record<string, any> = {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        userLevel: parseInt(data.userLevel),
      };

      if (parseInt(data.userLevel) === 2) {
        payload.doctorProfile = {
          fullName: data.doctorFullName || `${data.firstName} ${data.lastName}`,
          licenseNumber: data.doctorLicense || "",
          npiNumber: data.doctorNPI || "",
          deaNumber: data.doctorDEA || "",
          phone: data.doctorPhone || data.phone || "",
          fax: data.doctorFax || "",
          address: data.doctorAddress || "",
          specialty: data.doctorSpecialty || "",
          state: data.doctorState || "",
          formTemplate: data.formTemplate || "",
        };
      }

      const response = await apiRequest("POST", "/api/admin/users", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/doctor-profiles"] });
      toast({
        title: "User Created",
        description: isDoctor
          ? "Doctor account and profile have been created successfully."
          : "The new user account has been created successfully.",
      });
      setAddDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddUserFormData) => {
    createUserMutation.mutate(data);
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === "all" || user.userLevel === parseInt(levelFilter);
    return matchesSearch && matchesLevel;
  }) || [];

  const canEditLevel = currentUser?.userLevel === 4 || currentUser?.userLevel === 5;
  const maxCreatableLevel = currentUser?.userLevel || 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-users-title">
              User Management
            </h1>
            <p className="text-muted-foreground">
              View and manage all users on the platform
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account. {isDoctor && "For doctors, you can also set up their credentials and form template."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <Tabs value={addDialogTab} onValueChange={setAddDialogTab}>
                    <TabsList className="w-full">
                      <TabsTrigger value="account" className="flex-1">Account</TabsTrigger>
                      {isDoctor && (
                        <TabsTrigger value="credentials" className="flex-1">
                          <Stethoscope className="h-4 w-4 mr-1" />
                          Credentials
                        </TabsTrigger>
                      )}
                      {isDoctor && (
                        <TabsTrigger value="form" className="flex-1">
                          <FileText className="h-4 w-4 mr-1" />
                          Form Template
                        </TabsTrigger>
                      )}
                    </TabsList>

                    <ScrollArea className="h-[400px] mt-4 pr-4">
                      <TabsContent value="account" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" data-testid="input-add-first-name" {...field} />
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
                                  <Input placeholder="Doe" data-testid="input-add-last-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="user@example.com" data-testid="input-add-email" {...field} />
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
                                <Input type="password" placeholder="Min 6 characters" data-testid="input-add-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (optional)</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="(555) 123-4567" data-testid="input-add-phone" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="userLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-add-user-level">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">{getLevelName(1)} (Level 1)</SelectItem>
                                  <SelectItem value="2">{getLevelName(2)} (Level 2)</SelectItem>
                                  {maxCreatableLevel >= 3 && (
                                    <SelectItem value="3">{getLevelName(3)} (Level 3)</SelectItem>
                                  )}
                                  {maxCreatableLevel >= 4 && (
                                    <SelectItem value="4">{getLevelName(4)} (Level 4)</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              {isDoctor && (
                                <FormDescription>
                                  Doctor selected — use the Credentials and Form Template tabs to set up their profile.
                                </FormDescription>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      {isDoctor && (
                        <TabsContent value="credentials" className="space-y-4">
                          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                            Enter the doctor's professional credentials. These will be embedded into generated documents.
                          </div>
                          <FormField
                            control={form.control}
                            name="doctorFullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name (as it appears on documents)</FormLabel>
                                <FormControl>
                                  <Input placeholder="Dr. John A. Doe, MD" data-testid="input-doctor-full-name" {...field} />
                                </FormControl>
                                <FormDescription>Leave blank to use First + Last name</FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="doctorLicense"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>License Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="MD-12345" data-testid="input-doctor-license" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="doctorNPI"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>NPI Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="1234567890" data-testid="input-doctor-npi" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="doctorDEA"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>DEA Number</FormLabel>
                                  <FormControl>
                                    <Input placeholder="AB1234567" data-testid="input-doctor-dea" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="doctorSpecialty"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Specialty</FormLabel>
                                  <FormControl>
                                    <Input placeholder="General Practice" data-testid="input-doctor-specialty" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="doctorPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Office Phone</FormLabel>
                                  <FormControl>
                                    <Input placeholder="(555) 123-4567" data-testid="input-doctor-phone" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="doctorFax"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Fax</FormLabel>
                                  <FormControl>
                                    <Input placeholder="(555) 123-4568" data-testid="input-doctor-fax" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={form.control}
                            name="doctorAddress"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Office Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 Medical Plaza, Suite 100" data-testid="input-doctor-address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="doctorState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>State</FormLabel>
                                <FormControl>
                                  <Input placeholder="OK" data-testid="input-doctor-state" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      )}

                      {isDoctor && (
                        <TabsContent value="form" className="space-y-4">
                          <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                            Paste or write the HTML form template for this doctor. Use placeholders like <code className="bg-background px-1 rounded">{"{{patientName}}"}</code> and the system will automatically fill in the patient's data when generating the document.
                          </div>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setShowPlaceholders(!showPlaceholders)}
                              data-testid="button-toggle-placeholders"
                            >
                              <Info className="h-4 w-4 mr-1" />
                              {showPlaceholders ? "Hide" : "Show"} Available Placeholders
                            </Button>
                          </div>
                          {showPlaceholders && (
                            <div className="border rounded-md p-3 bg-muted/50 max-h-48 overflow-y-auto">
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                {PLACEHOLDERS_REFERENCE.map((p) => (
                                  <div key={p.tag} className="flex justify-between gap-2">
                                    <code className="text-primary font-mono">{p.tag}</code>
                                    <span className="text-muted-foreground">{p.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <FormField
                            control={form.control}
                            name="formTemplate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Form Template (HTML)</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder={`<html>\n<body>\n  <h1>Doctor's Note</h1>\n  <p>Date: {{date}}</p>\n  <p>Doctor: {{doctorName}}</p>\n  <p>License: {{doctorLicense}}</p>\n  <p>Patient: {{patientName}}</p>\n  <p>DOB: {{patientDOB}}</p>\n  <p>Reason: {{reason}}</p>\n</body>\n</html>`}
                                    className="font-mono text-sm min-h-[250px]"
                                    data-testid="input-form-template"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  This HTML template will be used to generate documents when this doctor approves a patient. The doctor's credentials are pre-filled; patient data fills in automatically.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      )}
                    </ScrollArea>
                  </Tabs>

                  <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-add-user">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-submit-add-user">
                      {createUserMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        isDoctor ? "Create Doctor Account" : "Create User"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  {users?.length || 0} total users
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                    data-testid="input-search-users"
                  />
                </div>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full sm:w-40" data-testid="select-level-filter">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="1">{getLevelName(1)}</SelectItem>
                    <SelectItem value="2">{getLevelName(2)}</SelectItem>
                    <SelectItem value="3">{getLevelName(3)}</SelectItem>
                    <SelectItem value="4">{getLevelName(4)}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {user.firstName} {user.lastName}
                              {user.userLevel === 2 && (
                                <Stethoscope className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {getLevelName(user.userLevel)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {user.userLevel === 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setManualPaymentUser(user);
                                    setManualPaymentPackageId("");
                                    setManualPaymentReason("");
                                  }}
                                  data-testid={`button-manual-payment-${user.id}`}
                                  title="Manual Payment"
                                >
                                  <DollarSign className="h-4 w-4 text-green-500" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedUser(user)}
                                data-testid={`button-view-profile-${user.id}`}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          canEditLevel={canEditLevel}
        />

        <Dialog open={!!manualPaymentUser} onOpenChange={(open) => { if (!open) setManualPaymentUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Manual Payment
              </DialogTitle>
              <DialogDescription>
                Process a manual payment for {manualPaymentUser?.firstName} {manualPaymentUser?.lastName}. This will create an application and run it through the full workflow as if the patient paid on their own.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Select Package</Label>
                <Select value={manualPaymentPackageId} onValueChange={setManualPaymentPackageId}>
                  <SelectTrigger data-testid="select-manual-payment-package">
                    <SelectValue placeholder="Choose a registration type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activePackages.map((pkg: any) => (
                      <SelectItem key={pkg.id} value={pkg.id} data-testid={`select-package-${pkg.id}`}>
                        {pkg.name} — ${(Number(pkg.price) / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason for Manual Payment</Label>
                <Textarea
                  placeholder="e.g. Phone payment, cash payment, courtesy waiver..."
                  value={manualPaymentReason}
                  onChange={(e) => setManualPaymentReason(e.target.value)}
                  rows={3}
                  data-testid="input-manual-payment-reason"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setManualPaymentUser(null)}
                disabled={manualPaymentLoading}
                data-testid="button-cancel-manual-payment"
              >
                Cancel
              </Button>
              <Button
                onClick={handleManualPayment}
                disabled={!manualPaymentPackageId || manualPaymentLoading}
                data-testid="button-confirm-manual-payment"
              >
                {manualPaymentLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Process Payment"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
