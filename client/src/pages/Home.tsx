import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfig } from "@/contexts/ConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  Users,
  Award,
  FlaskConical,
  Building2,
  ChevronRight,
  ChevronDown,
  Star,
  Heart,
  Stethoscope,
  Clock,
  Shield,
  ClipboardCheck,
  ShieldCheck,
  Pill,
  Dna,
  Accessibility,
  NotebookPen,
} from "lucide-react";

function getMediaType(url: string): 'image' | 'video' | 'gif' {
  const extension = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '')) return 'video';
  if (extension === 'gif') return 'gif';
  return 'image';
}

export default function Home() {
  const { config } = useConfig();
  const { isAuthenticated, user } = useAuth();
  const [openFaq, setOpenFaq] = useState(0);

  const heroMediaUrl = config.heroMediaUrl || config.heroBackgroundUrl;
  const mediaType = heroMediaUrl ? getMediaType(heroMediaUrl) : null;

  const getDashboardPath = () => {
    if (!user) return "/register";
    switch (user.userLevel) {
      case 1: return "/dashboard/applicant";
      case 2: return "/dashboard/reviewer";
      case 3: return "/dashboard/agent";
      case 4: return "/dashboard/admin";
      case 5: return "/dashboard/owner";
      default: return "/";
    }
  };

  const services = [
    { icon: Heart, title: "Work Absence Notes", description: "Professional documentation for excused absences from work, reviewed by licensed providers." },
    { icon: Pill, title: "School Excuse Notes", description: "Verified medical excuses for school or university absences, delivered same day." },
    { icon: Stethoscope, title: "Medical Clearance", description: "Clearance documentation for return to work, sports, or other activities." },
    { icon: Dna, title: "Custom Medical Notes", description: "Tailored medical documentation for specific needs with professional review." },
    { icon: Accessibility, title: "Accommodation Letters", description: "Documentation supporting workplace or educational accommodations." },
    { icon: NotebookPen, title: "Urgent Requests", description: "Priority processing for time-sensitive documentation needs." },
  ];

  const stats = [
    { icon: Users, value: "10,000+", label: "Customers Served" },
    { icon: Building2, value: "24hr", label: "Processing Time" },
    { icon: FlaskConical, value: "100%", label: "Confidential" },
    { icon: Award, value: "4.9/5", label: "Customer Rating" },
  ];

  const faqs = [
    { q: "How quickly will I receive my doctor's note?", a: "Most notes are processed and delivered within a few hours. Our priority service can deliver notes even faster for urgent needs." },
    { q: "Are the doctor's notes legitimate?", a: "Yes, all documentation is reviewed and approved by licensed medical professionals. Our notes meet standard requirements for employers and educational institutions." },
    { q: "Is my personal information kept confidential?", a: "Absolutely. We use industry-standard encryption and never share your personal information with third parties. Your privacy is our top priority." },
    { q: "What types of doctor's notes do you offer?", a: "We offer work absence notes, school excuse notes, medical clearance letters, accommodation documentation, and custom medical notes for various needs." },
    { q: "Can I get a refund if I'm not satisfied?", a: "Yes, we offer a satisfaction guarantee. If your note doesn't meet your needs, contact our support team for assistance." },
    { q: "Do I need to provide medical records?", a: "No medical records are required. Simply provide the basic information about your situation, and our medical team will handle the rest." },
  ];

  const testimonials = [
    { name: "Sarah M.", role: "Working Professional", text: "Got my work absence note within 2 hours. The process was incredibly smooth and professional. Highly recommend!", rating: 5 },
    { name: "James K.", role: "College Student", text: "Needed a school excuse note last minute and they delivered. The note was professional and accepted without any issues.", rating: 5 },
    { name: "Emily R.", role: "Freelancer", text: "The medical clearance letter was exactly what I needed. Professional, quick, and completely confidential.", rating: 5 },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center py-16 md:py-24 bg-[hsl(var(--section-bg))]">
        {heroMediaUrl && mediaType === 'image' && (
          <img
            src={heroMediaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-hero-background"
          />
        )}
        {heroMediaUrl && mediaType === 'video' && (
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src={heroMediaUrl}
            autoPlay loop muted playsInline
            data-testid="video-hero-background"
          />
        )}
        {heroMediaUrl && mediaType === 'gif' && (
          <img
            className="absolute inset-0 w-full h-full object-cover"
            src={heroMediaUrl}
            alt="Hero background"
            data-testid="img-hero-gif-background"
          />
        )}
        {!heroMediaUrl && (
          <img
            src="/images/medilab/hero-bg.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            data-testid="img-hero-default"
          />
        )}

        <div className="container relative z-10">
          <div className="bg-primary/90 text-primary-foreground rounded-md p-8 md:p-10 max-w-lg mb-8" data-testid="hero-welcome-box">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 !text-white">
              {config.heroTitle || `WELCOME TO ${config.siteName.toUpperCase()}`}
            </h2>
            <p className="text-primary-foreground/90 mb-5">
              {config.heroSubtitle || "Professional medical documentation delivered quickly and discreetly. Trusted by thousands."}
            </p>
            <div className="text-center">
              {isAuthenticated ? (
                <Link href={getDashboardPath()} className="inline-flex items-center gap-2 text-primary-foreground font-medium hover:underline" data-testid="button-hero-dashboard">
                  <span>Go to Dashboard</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link href={config.heroButtonLink || "/packages"} className="inline-flex items-center gap-2 text-primary-foreground font-medium hover:underline" data-testid="button-hero-learn">
                  <span>{config.heroButtonText || "Learn More"}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: ClipboardCheck, title: "Licensed Professionals", desc: "All documentation reviewed and approved by verified medical providers." },
              { icon: ShieldCheck, title: "100% Confidential", desc: "Your information is encrypted and never shared with third parties." },
              { icon: Clock, title: "Same-Day Delivery", desc: "Receive your verified documentation within hours of submitting your request." },
            ].map((item, i) => (
              <Card key={i} className="bg-background/95 backdrop-blur-sm" data-testid={`hero-icon-box-${i}`}>
                <CardContent className="p-6 text-center">
                  <item.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h4 className="text-lg font-bold mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 md:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <div className="relative">
              <img
                src="/images/medilab/about.jpg"
                alt="About our service"
                className="rounded-md w-full object-cover"
                data-testid="img-about"
              />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-about-title">
                About Us
              </h3>
              <p className="text-muted-foreground mb-8">
                We provide fast, professional medical documentation for individuals who need legitimate doctor's notes for work, school, or personal needs. Our licensed medical professionals ensure every document meets the highest standards.
              </p>
              <div className="space-y-8">
                {[
                  { icon: ShieldCheck, title: "Verified Medical Professionals", desc: "Every note is reviewed and signed by a licensed healthcare provider." },
                  { icon: Clock, title: "Fast Turnaround Time", desc: "Most requests are processed within hours, with priority options available." },
                  { icon: Shield, title: "Complete Privacy Protection", desc: "Your personal health information is encrypted and never shared with anyone." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-5 items-start" data-testid={`about-item-${i}`}>
                    <item.icon className="h-12 w-12 text-primary shrink-0" />
                    <div>
                      <h5 className="text-lg font-bold mb-1">{item.title}</h5>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[hsl(var(--section-bg))]">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center" data-testid={`stat-${i}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl mb-3 shadow-md relative z-10">
                  <stat.icon className="h-6 w-6" />
                </div>
                <Card className="w-full -mt-7 pt-10 pb-5 text-center shadow-md">
                  <CardContent className="p-0">
                    <span className="text-2xl md:text-3xl font-bold block mb-1" data-testid={`text-stat-value-${i}`}>{stat.value}</span>
                    <p className="text-muted-foreground text-sm">{stat.label}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-medium section-title-underline" data-testid="text-services-title">
              Services
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              Professional medical documentation for every situation, delivered with speed and discretion.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <div
                key={i}
                className="group border rounded-md p-10 text-center transition-all duration-300 hover:bg-primary hover:border-primary cursor-pointer"
                data-testid={`card-service-${i}`}
              >
                <div className="relative mx-auto w-16 h-16 bg-primary rounded-md flex items-center justify-center mb-5 group-hover:bg-background transition-colors">
                  <service.icon className="h-7 w-7 text-primary-foreground group-hover:text-primary transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:!text-primary-foreground transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-muted-foreground group-hover:text-primary-foreground/80 transition-colors leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Order Section */}
      <section className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 !text-white" data-testid="text-cta-title">
              Need a Doctor's Note Now?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Join thousands of satisfied customers. Get your verified documentation in just a few simple steps.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild data-testid="button-cta-start">
                <Link href="/register">
                  Get Your Note Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground" asChild data-testid="button-cta-services">
                <Link href="/packages">View Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-20 bg-[hsl(var(--section-bg))]">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-medium section-title-underline" data-testid="text-faq-title">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mt-4">
              Find answers to common questions about our doctor's note service.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className={`border rounded-md overflow-hidden transition-all duration-300 ${openFaq === i ? 'bg-primary text-primary-foreground border-primary' : 'bg-background'}`}
                data-testid={`faq-item-${i}`}
              >
                <button
                  className="w-full flex items-center justify-between p-5 text-left font-medium"
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  data-testid={`button-faq-toggle-${i}`}
                >
                  <span className={`text-base ${openFaq === i ? '!text-white' : ''}`}>{faq.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 ml-4 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-primary-foreground/90 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-2">
              <h3 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-testimonials-title">
                Testimonials
              </h3>
              <p className="text-muted-foreground">
                Hear from our satisfied customers who trust us for their medical documentation needs. We're proud to maintain a 4.9/5 rating across thousands of orders.
              </p>
            </div>
            <div className="lg:col-span-3">
              <div className="space-y-6">
                {testimonials.map((t, i) => (
                  <Card key={i} className="shadow-md" data-testid={`testimonial-${i}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {t.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm" data-testid={`text-testimonial-name-${i}`}>{t.name}</h4>
                          <p className="text-xs text-muted-foreground">{t.role}</p>
                          <div className="flex gap-0.5 mt-0.5">
                            {Array(t.rating).fill(null).map((_, j) => (
                              <Star key={j} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground italic" data-testid={`text-testimonial-${i}`}>"{t.text}"</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-20 bg-primary text-primary-foreground">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 !text-white">
              Ready to Get Started?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8">
              Create your account today and receive your doctor's note in minutes. Our team is available 24/7 to assist you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild data-testid="button-contact-register">
                <Link href="/register">
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground" asChild data-testid="button-contact-services">
                <Link href="/packages">Browse Services</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
