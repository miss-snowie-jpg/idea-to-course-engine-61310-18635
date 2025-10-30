import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Smartphone } from "lucide-react";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPayment: (method: "paypal" | "telebirr") => void;
}

export function PaymentMethodDialog({ open, onOpenChange, onSelectPayment }: PaymentMethodDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Payment Method</DialogTitle>
          <DialogDescription className="text-base">
            Select how you'd like to complete your payment
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          <Button
            className="w-full h-16 text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90"
            onClick={() => onSelectPayment("paypal")}
          >
            <CreditCard className="mr-3 h-6 w-6" />
            Pay with PayPal
          </Button>
          <Button
            className="w-full h-16 text-lg bg-gradient-to-r from-accent to-primary hover:opacity-90"
            onClick={() => onSelectPayment("telebirr")}
          >
            <Smartphone className="mr-3 h-6 w-6" />
            Pay with Telebirr
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
