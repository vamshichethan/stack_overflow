import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axiosInstance from "@/lib/axiosinstance";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { toast } from "react-toastify";

const LIMIT_MESSAGE = "You can use this option only one time per day.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;

type ResetType = "email" | "phone";
type MessageType = "success" | "warning" | "error";

export default function ForgotPasswordPage() {
  const [resetType, setResetType] = useState<ResetType>("email");
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("success");

  const resetMessage = () => {
    setMessage("");
    setMessageType("success");
  };

  const validateIdentifier = () => {
    const trimmed = identifier.trim();

    if (!trimmed) {
      return "Please enter your registered email address or phone number.";
    }

    if (resetType === "email" && !EMAIL_REGEX.test(trimmed.toLowerCase())) {
      return "Please enter a valid email address.";
    }

    if (
      resetType === "phone" &&
      !PHONE_REGEX.test(trimmed.replace(/[\s().-]/g, ""))
    ) {
      return "Please enter a valid phone number.";
    }

    return "";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessage();

    const validationError = validateIdentifier();

    if (validationError) {
      setMessage(validationError);
      setMessageType("error");
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/user/forgot-password", {
        type: resetType,
        identifier,
      });

      const successMessage =
        response.data?.message ||
        "A new password has been sent to your registered email address.";

      setMessage(successMessage);
      setMessageType("success");
      setIdentifier("");
      toast.success(successMessage);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Unable to reset password. Please try again.";
      const isLimitExceeded =
        error.response?.status === 429 || errorMessage === LIMIT_MESSAGE;

      setMessage(errorMessage);
      setMessageType(isLimitExceeded ? "warning" : "error");

      if (isLimitExceeded) {
        toast.warn(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const messageClassName =
    messageType === "success"
      ? "border-green-200 bg-green-50 text-green-700"
      : messageType === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <Link href="/" className="flex items-center justify-center mb-4">
            <div className="w-6 h-6 lg:w-8 lg:h-8 bg-orange-500 rounded mr-2 flex items-center justify-center">
              <div className="w-4 h-4 lg:w-6 lg:h-6 bg-white rounded-sm flex items-center justify-center">
                <div className="w-3 h-3 lg:w-4 lg:h-4 bg-orange-500 rounded-sm"></div>
              </div>
            </div>
            <span className="text-lg lg:text-xl font-bold text-gray-800">
              stack<span className="font-normal">overflow</span>
            </span>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-xl lg:text-2xl">
                Reset your password
              </CardTitle>
              <CardDescription>
                We will send a new password to your registered email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={resetType === "email" ? "default" : "outline"}
                  className={
                    resetType === "email"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-white text-gray-700"
                  }
                  onClick={() => {
                    setResetType("email");
                    setIdentifier("");
                    resetMessage();
                  }}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={resetType === "phone" ? "default" : "outline"}
                  className={
                    resetType === "phone"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-white text-gray-700"
                  }
                  onClick={() => {
                    setResetType("phone");
                    setIdentifier("");
                    resetMessage();
                  }}
                >
                  <Phone className="w-4 h-4" />
                  Phone
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-sm">
                  {resetType === "email"
                    ? "Registered email"
                    : "Registered phone"}
                </Label>
                <Input
                  id="identifier"
                  type={resetType === "email" ? "email" : "tel"}
                  placeholder={
                    resetType === "email" ? "m@example.com" : "9876543210"
                  }
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value);
                    resetMessage();
                  }}
                  autoComplete={resetType === "email" ? "email" : "tel"}
                />
              </div>

              {message && (
                <div
                  className={`rounded-md border px-3 py-2 text-sm ${messageClassName}`}
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm"
                disabled={loading}
              >
                {loading ? "Sending password..." : "Send new password"}
              </Button>

              <div className="text-center text-sm">
                <Link
                  href="/auth"
                  className="inline-flex items-center justify-center gap-1 text-blue-600 hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to log in
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
