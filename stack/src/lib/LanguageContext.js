import axiosInstance from "./axiosinstance";
import i18n from "./i18n";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "./AuthContext";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState("en");
  const [pendingLanguage, setPendingLanguage] = useState(null);
  const [otpDestination, setOtpDestination] = useState("");
  const [otpChannel, setOtpChannel] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetchLanguage = async () => {
      if (!user) {
        setLanguage("en");
        i18n.changeLanguage("en");
        return;
      }

      try {
        const response = await axiosInstance.get("/user/language");
        const preferredLanguage = response.data.data?.preferredLanguage || "en";

        setLanguage(preferredLanguage);
        i18n.changeLanguage(preferredLanguage);
      } catch (error) {
        console.log(error);
      }
    };

    fetchLanguage();
  }, [user]);

  const requestLanguageChange = async (selectedLanguage) => {
    if (!user) {
      toast.error(i18n.t("language.loginRequired"));
      return false;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post("/user/language/request-otp", {
        language: selectedLanguage,
      });

      setPendingLanguage(response.data.data.pendingLanguage);
      setOtpDestination(response.data.data.maskedDestination);
      setOtpChannel(response.data.data.channel);
      setOtpOpen(true);
      toast.success(response.data.message || i18n.t("common.otpSent"));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send OTP.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyLanguageOtp = async (otp) => {
    setVerifying(true);

    try {
      const response = await axiosInstance.post("/user/language/verify-otp", {
        otp,
      });
      const preferredLanguage = response.data.data.preferredLanguage;

      setLanguage(preferredLanguage);
      i18n.changeLanguage(preferredLanguage);
      setOtpOpen(false);
      setPendingLanguage(null);
      setOtpDestination("");
      setOtpChannel("");
      toast.success(response.data.message || i18n.t("common.languageChanged"));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || i18n.t("common.invalidOtp"));
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const closeOtpModal = () => {
    setOtpOpen(false);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        pendingLanguage,
        otpDestination,
        otpChannel,
        otpOpen,
        loading,
        verifying,
        requestLanguageChange,
        verifyLanguageOtp,
        closeOtpModal,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
