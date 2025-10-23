"use client";

import PrintableScaleTicket from "@/components/printable-scale-ticket";

export default function PrintPreviewPage() {
  return (
    <div className="bg-gray-800 p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
            <PrintableScaleTicket autoPrint={false} />
        </div>
    </div>
  );
}
