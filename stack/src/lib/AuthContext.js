import { useState } from "react";
import { createContext } from "react";
import axiosInstance from "./axiosinstance";
import { toast } from "react-toastify";
import { useContext } from "react";
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    }
    return null;
  });
  const [loading, setloading] = useState(false);
  const [error, seterror] = useState(null);

  const Signup = async ({ name, email, password, phone }) => {
    setloading(true);
    seterror(null);
    try {
      const res = await axiosInstance.post("/user/signup", {
        name,
        email,
        password,
        phone,
      });
      const { data, token } = res.data;
      localStorage.setItem("user", JSON.stringify({...data,token}));
      setUser({...data, token});
      toast.success("Signup Successful");
    } catch (error) {
      const msg = error.response?.data?.message || "Signup failed";
      seterror(msg);
      toast.error(msg);
      throw error;
    } finally {
      setloading(false);
    }
  };
  const Login = async ({ email, password }) => {
    setloading(true);
    seterror(null);
    try {
      const res = await axiosInstance.post("/user/login", {
        email,
        password,
      });
      if (res.data?.otpRequired) {
        toast.info(res.data.message || "OTP sent successfully.");
        return res.data;
      }

      const { data, token } = res.data;
      localStorage.setItem("user", JSON.stringify({...data,token}));
      setUser({...data, token});
      toast.success("Login Successful");
      return res.data;
    } catch (error) {
      const msg = error.response?.data?.message || "Login failed";
      seterror(msg);
      toast.error(msg);
      throw error;
    } finally {
      setloading(false);
    }
  };
  const VerifyLoginOtp = async ({ challengeToken, otp }) => {
    setloading(true);
    seterror(null);
    try {
      const res = await axiosInstance.post("/user/login/verify-otp", {
        challengeToken,
        otp,
      });
      const { data, token } = res.data;
      localStorage.setItem("user", JSON.stringify({ ...data, token }));
      setUser({ ...data, token });
      toast.success("Login Successful");
      return res.data;
    } catch (error) {
      const msg = error.response?.data?.message || "OTP verification failed";
      seterror(msg);
      toast.error(msg);
      throw error;
    } finally {
      setloading(false);
    }
  };
  const Logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    toast.info("Logged out");
  };
  return (
    <AuthContext.Provider
      value={{ user, Signup, Login, VerifyLoginOtp, Logout, loading, error }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);
