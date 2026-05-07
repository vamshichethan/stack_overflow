import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/LanguageContext";
import { supportedLanguages } from "@/lib/i18n";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageSelector() {
  const { t } = useTranslation();
  const {
    language,
    pendingLanguage,
    otpDestination,
    otpOpen,
    loading,
    verifying,
    requestLanguageChange,
    verifyLanguageOtp,
    closeOtpModal,
  } = useLanguage();
  const [hasMounted, setHasMounted] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (otpOpen) {
      setOtp("");
    }
  }, [otpOpen]);

  if (!hasMounted) {
    return null;
  }

  const pendingLabel =
    supportedLanguages.find((item) => item.code === pendingLanguage)?.labelKey ||
    "language.english";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp.trim())) {
      return;
    }

    await verifyLanguageOtp(otp.trim());
  };

  return (
    <>
      <div className="hidden sm:flex items-center gap-2">
        <Label htmlFor="language-selector" className="sr-only">
          {t("language.label")}
        </Label>
        <select
          id="language-selector"
          value={language}
          disabled={loading}
          onChange={(event) => requestLanguageChange(event.target.value)}
          className="h-9 rounded border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          {supportedLanguages.map((item) => (
            <option key={item.code} value={item.code}>
              {t(item.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <Dialog open={otpOpen} onOpenChange={closeOtpModal}>
        <DialogContent className="bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle>{t("language.verifyTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              {t("language.verifyDescription", {
                destination: otpDestination,
                language: t(pendingLabel),
              })}
            </p>
            <div className="space-y-2">
              <Label htmlFor="language-otp">{t("language.otpLabel")}</Label>
              <Input
                id="language-otp"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="bg-white text-gray-800"
                onClick={closeOtpModal}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={verifying || otp.length !== 6}
              >
                {verifying ? t("language.verifying") : t("language.verify")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
