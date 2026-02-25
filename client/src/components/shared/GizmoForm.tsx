import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2, Eye, RefreshCw, CheckCircle } from "lucide-react";

const FIELD_NAME_MAP: Record<string, { source: "patient" | "doctor" | "meta"; key: string }> = {
  firstname: { source: "patient", key: "firstName" },
  middlename: { source: "patient", key: "middleName" },
  lastname: { source: "patient", key: "lastName" },
  suffix: { source: "patient", key: "suffix" },
  dateofbirth: { source: "patient", key: "dateOfBirth" },
  dob: { source: "patient", key: "dateOfBirth" },
  address: { source: "patient", key: "address" },
  apt: { source: "patient", key: "apt" },
  city: { source: "patient", key: "city" },
  state: { source: "patient", key: "state" },
  zipcode: { source: "patient", key: "zipCode" },
  zip: { source: "patient", key: "zipCode" },
  phone: { source: "patient", key: "phone" },
  email: { source: "patient", key: "email" },
  medicalcondition: { source: "patient", key: "medicalCondition" },
  idnumber: { source: "patient", key: "idNumber" },
  idexpirationdate: { source: "patient", key: "idExpirationDate" },
  date: { source: "meta", key: "generatedDate" },
  doctorfirstname: { source: "doctor", key: "firstName" },
  doctormiddlename: { source: "doctor", key: "middleName" },
  doctorlastname: { source: "doctor", key: "lastName" },
  doctorphone: { source: "doctor", key: "phone" },
  doctoraddress: { source: "doctor", key: "address" },
  doctorcity: { source: "doctor", key: "city" },
  doctorstate: { source: "doctor", key: "state" },
  doctorzipcode: { source: "doctor", key: "zipCode" },
  doctorlicensenumber: { source: "doctor", key: "licenseNumber" },
  doctornpinumber: { source: "doctor", key: "npiNumber" },
};

const PLACEHOLDER_MAP: Record<string, { source: "patient" | "doctor" | "meta"; key: string }> = {
  "{firstName}": { source: "patient", key: "firstName" },
  "{middleName}": { source: "patient", key: "middleName" },
  "{lastName}": { source: "patient", key: "lastName" },
  "{suffix}": { source: "patient", key: "suffix" },
  "{dateOfBirth}": { source: "patient", key: "dateOfBirth" },
  "{address}": { source: "patient", key: "address" },
  "{apt}": { source: "patient", key: "apt" },
  "{city}": { source: "patient", key: "city" },
  "{state}": { source: "patient", key: "state" },
  "{zipCode}": { source: "patient", key: "zipCode" },
  "{zip}": { source: "patient", key: "zipCode" },
  "{phone}": { source: "patient", key: "phone" },
  "{email}": { source: "patient", key: "email" },
  "{medicalCondition}": { source: "patient", key: "medicalCondition" },
  "{idNumber}": { source: "patient", key: "idNumber" },
  "{idExpirationDate}": { source: "patient", key: "idExpirationDate" },
  "{date}": { source: "meta", key: "generatedDate" },
  "{doctorFirstName}": { source: "doctor", key: "firstName" },
  "{doctorMiddleName}": { source: "doctor", key: "middleName" },
  "{doctorLastName}": { source: "doctor", key: "lastName" },
  "{doctorPhone}": { source: "doctor", key: "phone" },
  "{doctorAddress}": { source: "doctor", key: "address" },
  "{doctorCity}": { source: "doctor", key: "city" },
  "{doctorState}": { source: "doctor", key: "state" },
  "{doctorZipCode}": { source: "doctor", key: "zipCode" },
  "{doctorLicenseNumber}": { source: "doctor", key: "licenseNumber" },
  "{doctorNpiNumber}": { source: "doctor", key: "npiNumber" },
};

const RADIO_AUTO_FILL: Record<string, { sourceField: string; valueMap: Record<string, string> }> = {
  idtype: {
    sourceField: "idType",
    valueMap: {
      drivers_license: "dl",
      us_passport_photo_id: "passport",
      id_card: "idcard",
      tribal_id_card: "tribal",
    },
  },
};

const DOCTOR_FORM_OFFSETS: Record<string, { x: number; y: number }> = {
  fore: { x: 3, y: -4 },
  foshee: { x: 0, y: -3 },
};

export interface GizmoFormData {
  success: boolean;
  gizmoFormLayout?: "A" | "B";
  patientData: Record<string, string>;
  doctorData: Record<string, string>;
  gizmoFormUrl: string | null;
  generatedDate: string;
  patientName: string;
}

interface PlaceholderField {
  token: string;
  value: string;
  x: number;
  y: number;
  width: number;
  pageIndex: number;
  label: string;
}

interface RadioField {
  group: string;
  option: string;
  x: number;
  y: number;
  pageIndex: number;
  selected: boolean;
  fontSize: number;
}

function resolveValue(
  mapping: { source: "patient" | "doctor" | "meta"; key: string },
  data: GizmoFormData
): string {
  if (mapping.source === "patient") return data.patientData[mapping.key] || "";
  if (mapping.source === "doctor") return data.doctorData[mapping.key] || "";
  if (mapping.source === "meta" && mapping.key === "generatedDate") return data.generatedDate || "";
  return "";
}

function formatDOB(value: string): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  return value;
}

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface GizmoFormProps {
  data: GizmoFormData;
  onClose?: () => void;
}

export default function GizmoForm({ data, onClose }: GizmoFormProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"acroform" | "placeholder" | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [acroFields, setAcroFields] = useState<Record<string, string>>({});
  const [placeholderFields, setPlaceholderFields] = useState<PlaceholderField[]>([]);
  const [radioFields, setRadioFields] = useState<RadioField[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [scale, setScale] = useState(1.0);

  const loadPdf = useCallback(async () => {
    if (!data.gizmoFormUrl) {
      setError("No PDF template URL configured for this doctor.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const proxyUrl = `/api/forms/proxy-pdf?url=${encodeURIComponent(data.gizmoFormUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error("Failed to fetch PDF template");
      const bytes = await response.arrayBuffer();
      setPdfBytes(bytes);

      const PDFLib = await import("pdf-lib");
      const pdfDoc = await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      setPageCount(pages.length);

      const form = pdfDoc.getForm();
      const fields = form.getFields();

      let acroMatches = 0;
      const fieldValues: Record<string, string> = {};

      for (const field of fields) {
        const rawName = field.getName();
        const normalizedName = normalizeFieldName(rawName);
        const mapping = FIELD_NAME_MAP[normalizedName];

        if (mapping) {
          let val = resolveValue(mapping, data);
          if (mapping.key === "dateOfBirth") val = formatDOB(val);
          fieldValues[rawName] = val;
          acroMatches++;
        } else {
          fieldValues[rawName] = "";
        }
      }

      if (acroMatches > 0) {
        setMode("acroform");
        setAcroFields(fieldValues);
        setLoading(false);
        renderPage(bytes, 0);
        return;
      }

      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
      const pdfDocument = await loadingTask.promise;

      const detectedFields: PlaceholderField[] = [];
      const detectedRadios: RadioField[] = [];

      for (let pageIdx = 0; pageIdx < pdfDocument.numPages; pageIdx++) {
        const page = await pdfDocument.getPage(pageIdx + 1);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });

        interface TextItem {
          str: string;
          transform: number[];
          width: number;
          height: number;
        }

        const items: TextItem[] = textContent.items.filter(
          (item: any) => "str" in item && item.str
        ) as TextItem[];

        const lines: TextItem[][] = [];
        for (const item of items) {
          const y = item.transform[5];
          let foundLine = false;
          for (const line of lines) {
            if (Math.abs(line[0].transform[5] - y) < 3) {
              line.push(item);
              foundLine = true;
              break;
            }
          }
          if (!foundLine) lines.push([item]);
        }

        for (const line of lines) {
          line.sort((a, b) => a.transform[4] - b.transform[4]);
          const fullText = line.map((i) => i.str).join("");

          const placeholderRegex = /\{(\w+)\}/g;
          let match;
          while ((match = placeholderRegex.exec(fullText)) !== null) {
            const token = match[0];
            const mapping = PLACEHOLDER_MAP[token];
            if (!mapping) continue;

            let charOffset = 0;
            let anchorItem: TextItem | null = null;
            let posInItem = 0;
            for (const item of line) {
              if (charOffset + item.str.length > match.index) {
                anchorItem = item;
                posInItem = match.index - charOffset;
                break;
              }
              charOffset += item.str.length;
            }

            if (!anchorItem) continue;

            const x = anchorItem.transform[4] + (posInItem / Math.max(anchorItem.str.length, 1)) * anchorItem.width;
            const y = anchorItem.transform[5];

            let val = resolveValue(mapping, data);
            if (mapping.key === "dateOfBirth") val = formatDOB(val);

            detectedFields.push({
              token,
              value: val,
              x,
              y: viewport.height - y,
              width: Math.max(token.length * 7, 80),
              pageIndex: pageIdx,
              label: mapping.key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
            });
          }

          const radioRegex = /\{radio_(\w+)_(\w+)\}/g;
          let radioMatch;
          while ((radioMatch = radioRegex.exec(fullText)) !== null) {
            const groupName = radioMatch[1].toLowerCase();
            const optionValue = radioMatch[2].toLowerCase();

            let charOff = 0;
            let rAnchorItem: TextItem | null = null;
            for (const item of line) {
              if (charOff + item.str.length > radioMatch.index) {
                rAnchorItem = item;
                break;
              }
              charOff += item.str.length;
            }

            if (!rAnchorItem) continue;

            const autoFillRule = RADIO_AUTO_FILL[groupName];
            let selected = false;
            if (autoFillRule) {
              const sourceVal = data.patientData[autoFillRule.sourceField] || "";
              const mappedOption = autoFillRule.valueMap[sourceVal];
              if (mappedOption === optionValue) selected = true;
            }

            detectedRadios.push({
              group: groupName,
              option: optionValue,
              x: rAnchorItem.transform[4],
              y: viewport.height - rAnchorItem.transform[5],
              pageIndex: pageIdx,
              selected,
              fontSize: rAnchorItem.height || 12,
            });
          }
        }
      }

      setMode("placeholder");
      setPlaceholderFields(detectedFields);
      setRadioFields(detectedRadios);
      setLoading(false);
      renderPage(bytes, 0);
    } catch (err: any) {
      console.error("PDF load error:", err);
      setError(err.message || "Failed to load PDF template");
      setLoading(false);
    }
  }, [data]);

  const renderPage = async (bytes: ArrayBuffer, pageIdx: number) => {
    if (!canvasRef.current) return;
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
      const pdfDocument = await loadingTask.promise;
      const page = await pdfDocument.getPage(pageIdx + 1);

      const containerWidth = containerRef.current?.clientWidth || 600;
      const viewport = page.getViewport({ scale: 1.0 });
      const newScale = Math.min((containerWidth - 32) / viewport.width, 1.5);
      setScale(newScale);

      const scaledViewport = page.getViewport({ scale: newScale });
      const canvas = canvasRef.current;
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
    } catch (err) {
      console.error("Render error:", err);
    }
  };

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  useEffect(() => {
    if (pdfBytes && currentPage >= 0) {
      renderPage(pdfBytes, currentPage);
    }
  }, [currentPage, pdfBytes]);

  const handleFieldChange = (index: number, value: string) => {
    const updated = [...placeholderFields];
    updated[index] = { ...updated[index], value };
    setPlaceholderFields(updated);
  };

  const handleAcroFieldChange = (fieldName: string, value: string) => {
    setAcroFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleRadioToggle = (group: string, option: string) => {
    setRadioFields((prev) =>
      prev.map((r) => {
        if (r.group === group) {
          return { ...r, selected: r.option === option };
        }
        return r;
      })
    );
  };

  const downloadPdf = async () => {
    if (!pdfBytes) return;
    setDownloading(true);

    try {
      const PDFLib = await import("pdf-lib");
      const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });

      if (mode === "acroform") {
        const form = pdfDoc.getForm();
        for (const [fieldName, value] of Object.entries(acroFields)) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(value);
          } catch {}
        }
        form.flatten();
      } else if (mode === "placeholder") {
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        const doctorLastName = (data.doctorData.lastName || "").toLowerCase();
        const offsets = DOCTOR_FORM_OFFSETS[doctorLastName] || { x: 0, y: 0 };

        for (const field of placeholderFields) {
          if (field.pageIndex >= pages.length) continue;
          const page = pages[field.pageIndex];
          const pageHeight = page.getHeight();

          page.drawText(field.value, {
            x: field.x + offsets.x,
            y: pageHeight - field.y + offsets.y,
            size: 10,
            font,
            color: PDFLib.rgb(0, 0, 0),
          });
        }

        for (const radio of radioFields) {
          if (!radio.selected || radio.pageIndex >= pages.length) continue;
          const page = pages[radio.pageIndex];
          const pageHeight = page.getHeight();
          const radius = Math.max(radio.fontSize * 0.3, 4);

          page.drawCircle({
            x: radio.x + radius + offsets.x,
            y: pageHeight - radio.y + offsets.y,
            size: radius,
            color: PDFLib.rgb(0, 0, 0),
          });
        }
      }

      const filledBytes = await pdfDoc.save();
      const blob = new Blob([filledBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const firstName = (data.patientData.firstName || "Patient").replace(/[^a-zA-Z0-9]/g, "_");
      const lastName = (data.patientData.lastName || "").replace(/[^a-zA-Z0-9]/g, "_");
      const dateStr = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).replace(/\//g, "-");
      const fileName = `${firstName}_${lastName}_Physician_Recommendation_${dateStr}.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "PDF Downloaded", description: `Saved as ${fileName}` });
    } catch (err: any) {
      console.error("Download error:", err);
      toast({ title: "Download Failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Loading PDF Template...
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[400px] w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <FileText className="h-5 w-5" />
            PDF Template Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadPdf()} data-testid="button-retry-pdf">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>Close</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pageFields = placeholderFields.filter((f) => f.pageIndex === currentPage);
  const pageRadios = radioFields.filter((r) => r.pageIndex === currentPage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" data-testid="badge-fill-mode">
            {mode === "acroform" ? "AcroForm Mode" : "Placeholder Mode"}
          </Badge>
          <Badge variant="outline">
            {mode === "acroform"
              ? `${Object.keys(acroFields).length} fields`
              : `${placeholderFields.length} fields, ${radioFields.length} radios`}
          </Badge>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          )}
          <Button onClick={downloadPdf} disabled={downloading} data-testid="button-download-pdf">
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download Filled PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" ref={containerRef}>
          <Card>
            <CardContent className="p-2 overflow-auto relative">
              <canvas ref={canvasRef} className="mx-auto block" data-testid="pdf-canvas" />
              {mode === "placeholder" &&
                pageFields.map((field, idx) => {
                  const globalIdx = placeholderFields.indexOf(field);
                  return (
                    <input
                      key={`ph-${globalIdx}`}
                      type="text"
                      value={field.value}
                      onChange={(e) => handleFieldChange(globalIdx, e.target.value)}
                      className="absolute bg-yellow-100/70 dark:bg-yellow-900/40 border border-yellow-400 text-xs px-1 rounded"
                      style={{
                        left: field.x * scale + 8,
                        top: field.y * scale,
                        width: Math.max(field.width * scale, 60),
                        height: 18,
                      }}
                      title={field.label}
                      data-testid={`input-placeholder-${globalIdx}`}
                    />
                  );
                })}
            </CardContent>
            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-2 p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {mode === "acroform" ? "Form Fields" : "Detected Fields"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
              {mode === "acroform" &&
                Object.entries(acroFields).map(([fieldName, value]) => {
                  const normalized = normalizeFieldName(fieldName);
                  const mapping = FIELD_NAME_MAP[normalized];
                  const displayName = mapping
                    ? mapping.key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())
                    : fieldName;
                  return (
                    <div key={fieldName} className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        {displayName}
                        {mapping && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </Label>
                      <Input
                        value={value}
                        onChange={(e) => handleAcroFieldChange(fieldName, e.target.value)}
                        className="h-8 text-sm"
                        data-testid={`input-acro-${normalizeFieldName(fieldName)}`}
                      />
                    </div>
                  );
                })}

              {mode === "placeholder" && (
                <>
                  {placeholderFields.map((field, idx) => (
                    <div key={`ph-edit-${idx}`} className="space-y-1">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        {field.label}
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      </Label>
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldChange(idx, e.target.value)}
                        className="h-8 text-sm"
                        data-testid={`input-edit-${idx}`}
                      />
                    </div>
                  ))}

                  {radioFields.length > 0 && (
                    <>
                      <div className="pt-2 border-t">
                        <Label className="text-xs font-semibold text-muted-foreground">Radio Groups</Label>
                      </div>
                      {Array.from(new Set(radioFields.map((r) => r.group))).map((group) => {
                        const groupRadios = radioFields.filter((r) => r.group === group);
                        return (
                          <div key={group} className="space-y-1">
                            <Label className="text-xs text-muted-foreground capitalize">{group}</Label>
                            <div className="flex flex-wrap gap-2">
                              {groupRadios.map((radio) => (
                                <Button
                                  key={`${radio.group}-${radio.option}`}
                                  variant={radio.selected ? "default" : "outline"}
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={() => handleRadioToggle(radio.group, radio.option)}
                                  data-testid={`radio-${radio.group}-${radio.option}`}
                                >
                                  {radio.option}
                                </Button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </>
              )}

              {mode === "acroform" && Object.keys(acroFields).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No form fields detected in this PDF.
                </p>
              )}
              {mode === "placeholder" && placeholderFields.length === 0 && radioFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No placeholder tokens detected in this PDF.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Patient Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p data-testid="text-patient-name"><strong>{data.patientName}</strong></p>
              {data.patientData.email && <p className="text-muted-foreground">{data.patientData.email}</p>}
              {data.patientData.phone && <p className="text-muted-foreground">{data.patientData.phone}</p>}
              {data.patientData.dateOfBirth && (
                <p className="text-muted-foreground">DOB: {formatDOB(data.patientData.dateOfBirth)}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
