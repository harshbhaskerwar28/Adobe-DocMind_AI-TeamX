import { useState } from "react";
import { Menu, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DocumentSidebar } from "./DocumentSidebar";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80">
        <div className="h-full pt-4">
          <DocumentSidebar />
        </div>
      </SheetContent>
    </Sheet>
  );
}