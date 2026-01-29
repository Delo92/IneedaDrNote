import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Settings, Key, Database, Palette } from "lucide-react";

export default function SetupRequired() {
  const steps = [
    {
      title: "Firebase Configuration",
      description: "Set up Firebase for authentication",
      status: "pending",
      icon: Key,
      instructions: [
        "Go to the Firebase Console and create a new project",
        "Add a web app and enable Email/Password authentication",
        "Add your Replit Dev URL to authorized domains",
        "Copy the projectId, apiKey, and appId to your secrets",
      ],
      secrets: ["VITE_FIREBASE_PROJECT_ID", "VITE_FIREBASE_APP_ID", "VITE_FIREBASE_API_KEY"],
    },
    {
      title: "Database Setup",
      description: "PostgreSQL database is ready",
      status: "complete",
      icon: Database,
      instructions: ["Database is automatically provisioned by Replit"],
      secrets: [],
    },
    {
      title: "White-Label Customization",
      description: "Configure your branding",
      status: "optional",
      icon: Palette,
      instructions: [
        "Update site name, tagline, and colors via the Owner dashboard",
        "Configure role names (Level 1-5) for your use case",
        "Add your logo and favicon",
      ],
      secrets: [],
    },
  ];

  const checkSecret = (key: string) => {
    // In client-side code, we can only check VITE_ prefixed env vars
    return !!import.meta.env[key];
  };

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="container max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Settings className="mr-1 h-3 w-3" />
            Setup Required
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight mb-4" data-testid="text-setup-title">
            Welcome to Your White-Label Template
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            This template needs some configuration before it's ready to use. Follow the steps below to get started.
          </p>
        </div>

        <div className="space-y-6">
          {steps.map((step, index) => {
            const hasSecrets = step.secrets.length === 0 || step.secrets.every(checkSecret);
            const isComplete = step.status === "complete" || (step.status === "pending" && hasSecrets);

            return (
              <Card
                key={index}
                className={isComplete ? "border-chart-2/30 bg-chart-2/5" : ""}
                data-testid={`card-step-${index}`}
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                        isComplete
                          ? "bg-chart-2/10 text-chart-2"
                          : step.status === "optional"
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <step.icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{step.title}</CardTitle>
                        <Badge
                          variant={
                            isComplete
                              ? "default"
                              : step.status === "optional"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {isComplete ? "Complete" : step.status === "optional" ? "Optional" : "Required"}
                        </Badge>
                      </div>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 text-sm">
                    {step.instructions.map((instruction, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{instruction}</span>
                      </li>
                    ))}
                  </ol>

                  {step.secrets.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Required Secrets:</p>
                      <div className="flex flex-wrap gap-2">
                        {step.secrets.map((secret) => {
                          const exists = checkSecret(secret);
                          return (
                            <Badge
                              key={secret}
                              variant={exists ? "default" : "outline"}
                              className="font-mono text-xs"
                            >
                              {exists ? (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              ) : (
                                <AlertCircle className="mr-1 h-3 w-3" />
                              )}
                              {secret}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 p-6 rounded-lg border bg-card text-center">
          <h2 className="text-lg font-semibold mb-2">Need Help?</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Check the documentation or contact support for assistance with setup.
          </p>
          <p className="text-xs text-muted-foreground">
            Once configured, this setup page will be replaced by your application.
          </p>
        </div>
      </div>
    </div>
  );
}
