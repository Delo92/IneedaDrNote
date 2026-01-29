import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WhiteLabelConfig } from "@shared/config";
import { Loader2, Palette, Users, Building2, Save } from "lucide-react";

const configSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  tagline: z.string().optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  faviconUrl: z.string().url().optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  level1Name: z.string().min(1, "Level 1 name is required"),
  level2Name: z.string().min(1, "Level 2 name is required"),
  level3Name: z.string().min(1, "Level 3 name is required"),
  level4Name: z.string().min(1, "Level 4 name is required"),
  level5Name: z.string().min(1, "Level 5 name is required"),
});

type ConfigFormData = z.infer<typeof configSchema>;

export default function SiteSettings() {
  const { toast } = useToast();

  const { data: config, isLoading } = useQuery<WhiteLabelConfig>({
    queryKey: ["/api/config"],
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      siteName: "",
      tagline: "",
      description: "",
      logoUrl: "",
      faviconUrl: "",
      primaryColor: "#3b82f6",
      contactEmail: "",
      contactPhone: "",
      address: "",
      level1Name: "Applicant",
      level2Name: "Reviewer",
      level3Name: "Agent",
      level4Name: "Admin",
      level5Name: "Owner",
    },
  });

  useEffect(() => {
    if (config) {
      form.reset({
        siteName: config.siteName || "",
        tagline: config.tagline || "",
        description: config.description || "",
        logoUrl: config.logoUrl || "",
        faviconUrl: config.faviconUrl || "",
        primaryColor: config.primaryColor || "#3b82f6",
        contactEmail: config.contactEmail || "",
        contactPhone: config.contactPhone || "",
        address: config.address || "",
        level1Name: config.levelNames?.level1 || "Applicant",
        level2Name: config.levelNames?.level2 || "Reviewer",
        level3Name: config.levelNames?.level3 || "Agent",
        level4Name: config.levelNames?.level4 || "Admin",
        level5Name: config.levelNames?.level5 || "Owner",
      });
    }
  }, [config, form]);

  const updateConfig = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      const response = await apiRequest("PUT", "/api/owner/config", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({
        title: "Settings Saved",
        description: "Your site configuration has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ConfigFormData) => {
    updateConfig.mutate(data);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-settings-title">
            Site Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your platform's branding and settings
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="branding" className="space-y-6">
              <TabsList>
                <TabsTrigger value="branding">
                  <Palette className="mr-2 h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="roles">
                  <Users className="mr-2 h-4 w-4" />
                  Role Names
                </TabsTrigger>
                <TabsTrigger value="contact">
                  <Building2 className="mr-2 h-4 w-4" />
                  Contact Info
                </TabsTrigger>
              </TabsList>

              <TabsContent value="branding">
                <Card>
                  <CardHeader>
                    <CardTitle>Branding</CardTitle>
                    <CardDescription>
                      Customize your platform's appearance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="siteName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Site Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Application Portal" data-testid="input-site-name" {...field} />
                          </FormControl>
                          <FormDescription>
                            This appears in the header and page titles
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tagline"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tagline</FormLabel>
                          <FormControl>
                            <Input placeholder="Your trusted application partner" data-testid="input-tagline" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="A brief description of your platform..."
                              data-testid="input-description"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Color</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input
                                type="color"
                                className="w-16 h-10 p-1 cursor-pointer"
                                {...field}
                              />
                              <Input
                                placeholder="#3b82f6"
                                className="flex-1"
                                data-testid="input-primary-color"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/logo.png" data-testid="input-logo-url" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles">
                <Card>
                  <CardHeader>
                    <CardTitle>Role Names</CardTitle>
                    <CardDescription>
                      Customize the names for each user level in your platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="level1Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level 1 (Default Users)</FormLabel>
                          <FormControl>
                            <Input placeholder="Applicant" data-testid="input-level1" {...field} />
                          </FormControl>
                          <FormDescription>
                            Examples: Applicant, Pet Owner, Patient, Customer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="level2Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level 2 (Reviewers)</FormLabel>
                          <FormControl>
                            <Input placeholder="Reviewer" data-testid="input-level2" {...field} />
                          </FormControl>
                          <FormDescription>
                            Examples: Reviewer, Veterinarian, Doctor, Specialist
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="level3Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level 3 (Agents)</FormLabel>
                          <FormControl>
                            <Input placeholder="Agent" data-testid="input-level3" {...field} />
                          </FormControl>
                          <FormDescription>
                            Examples: Agent, Partner, Affiliate, Referrer
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="level4Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level 4 (Administrators)</FormLabel>
                          <FormControl>
                            <Input placeholder="Admin" data-testid="input-level4" {...field} />
                          </FormControl>
                          <FormDescription>
                            Examples: Admin, Manager, Supervisor, Coordinator
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="level5Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level 5 (Owners)</FormLabel>
                          <FormControl>
                            <Input placeholder="Owner" data-testid="input-level5" {...field} />
                          </FormControl>
                          <FormDescription>
                            Examples: Owner, Super Admin, Director, Principal
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact">
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>
                      Your platform's contact details for users
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="support@example.com" data-testid="input-contact-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(555) 555-5555" data-testid="input-contact-phone" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="123 Main St, City, State 12345"
                              data-testid="input-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={updateConfig.isPending} data-testid="button-save-settings">
                {updateConfig.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
