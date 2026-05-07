import Mainlayout from "@/layout/Mainlayout";
import axiosInstance from "@/lib/axiosinstance";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

const plans = [
  {
    name: "Free",
    price: "₹0",
    questions: "1 question/day",
    features: ["Public Q&A", "Community Support", "Basic Tagging"],
    color: "bg-gray-100",
    textColor: "text-gray-800",
  },
  {
    name: "Bronze",
    price: "₹100",
    questions: "5 questions/day",
    features: ["Everything in Free", "Priority Search", "Bronze Badge"],
    color: "bg-orange-100",
    textColor: "text-orange-800",
    amount: 100,
  },
  {
    name: "Silver",
    price: "₹300",
    questions: "10 questions/day",
    features: ["Everything in Bronze", "Chat Access", "Silver Badge"],
    color: "bg-blue-100",
    textColor: "text-blue-800",
    amount: 300,
  },
  {
    name: "Gold",
    price: "₹1000",
    questions: "Unlimited questions",
    features: ["Everything in Silver", "Direct Support", "Gold Badge"],
    color: "bg-yellow-100",
    textColor: "text-yellow-800",
    amount: 1000,
  },
];

export default function Plans() {
  const { user } = useAuth();
  const [isTimeValid, setIsTimeValid] = useState(false);

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      
      let istHours = (utcHours + 5) % 24;
      let istMinutes = utcMinutes + 30;
      if (istMinutes >= 60) {
        istHours = (istHours + 1) % 24;
        istMinutes -= 60;
      }
      
      setIsTimeValid(true); // Temporarily bypassed for testing
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (plan: any) => {
    if (!user) {
      toast.error("Please login to upgrade your plan");
      return;
    }

    if (!isTimeValid) {
      toast.warning("Payments are allowed only between 10:00 AM and 11:00 AM IST.");
      return;
    }

    const res = await loadRazorpay();
    if (!res) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      return;
    }

    try {
      const { data } = await axiosInstance.post("/payment/create-order", {
        plan: plan.name,
        amount: plan.amount,
      });

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "CodeQuest Stack Overflow",
        description: `${plan.name} Subscription`,
        order_id: data.id,
        handler: async (response: any) => {
          try {
            await axiosInstance.post("/payment/verify-payment", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: plan.name,
              userId: user._id,
            });
            toast.success("Subscription updated successfully!");
            window.location.reload();
          } catch (error) {
            toast.error("Payment verification failed");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#f48024",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <Mainlayout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-gray-600">Get the most out of CodeQuest with our premium plans.</p>
          
          {!isTimeValid && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4 mr-2" />
              Payments active between 10:00 AM - 11:00 AM IST
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`p-8 border border-gray-200 rounded-2xl flex flex-col h-full bg-white transition hover:shadow-lg ${
                user?.subscription?.plan === plan.name ? 'ring-2 ring-orange-500' : ''
              }`}
            >
              <div className="mb-6">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${plan.color} ${plan.textColor}`}>
                  {plan.name}
                </span>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="ml-1 text-gray-500">/month</span>
                </div>
                <p className="mt-2 text-sm text-gray-600 font-medium">
                  {plan.questions}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start text-sm">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.name === "Free" ? (
                <button className="w-full py-3 px-4 border border-gray-200 rounded-xl text-gray-400 font-bold cursor-not-allowed">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handlePayment(plan)}
                  disabled={user?.subscription?.plan === plan.name}
                  className={`w-full py-3 px-4 rounded-xl font-bold transition ${
                    user?.subscription?.plan === plan.name
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isTimeValid
                      ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md hover:shadow-lg"
                      : "bg-gray-200 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {user?.subscription?.plan === plan.name ? "Active Plan" : "Upgrade"}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-2xl text-center border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">
            Current Active Plan: <span className="font-bold text-gray-800">{user?.subscription?.plan || "Free"}</span>
          </p>
        </div>
      </div>
    </Mainlayout>
  );
}
