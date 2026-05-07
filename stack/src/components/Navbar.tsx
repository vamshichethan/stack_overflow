import LanguageSelector from "@/components/LanguageSelector";
import { useAuth } from "@/lib/AuthContext";
import { Menu, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// const User = {
//   _id: "1",
//   name: "Alice Johnson",
// };

const Navbar = ({ handleslidein }: any) => {
  const { user, Logout } = useAuth();
  const { t } = useTranslation();
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  const handlelogout = () => {
    Logout();
  };
  return (
    <div className=" top-0 z-50 w-full min-h-[53px] bg-white border-t-[3px] border-[#ef8236] shadow-[0_1px_5px_#00000033] flex items-center justify-center">
      <div className="w-[90%] max-w-[1440px] flex items-center justify-between mx-auto py-1">
        <button
          aria-label="Toggle sidebar"
          className="sm:block md:hidden p-2 rounded hover:bg-gray-100 transition"
          onClick={handleslidein}
        >
          <Menu className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex items-center gap-2 flex-grow">
          <Link href="/" className="px-3 py-1 flex items-center gap-1">
            <svg aria-hidden="true" className="w-8 h-8" viewBox="0 0 32 37">
              <path d="M26 33v-9h4v13H0V24h4v9h22Z" fill="#BCBBBB"/>
              <path d="m21.5 0-2.7 2 9.9 13.3 2.7-2L21.5 0ZM26 18.4 13.3 7.8l2.1-2.5 12.7 10.6-2.1 2.5ZM9.1 15.2l15 7 1.4-3-15-7-1.4 3Zm14 10.79.68-2.95-16.1-3.35L7 23l16.1 2.99ZM23 30H7v-3h16v3Z" fill="#F48024"/>
            </svg>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
              stack<span className="font-normal text-gray-900">overflow</span>
            </span>
          </Link>

          <div className="hidden sm:flex gap-1">
            <Link
              href="/"
              className="text-sm text-[#454545] font-medium px-4 py-2 rounded hover:bg-gray-200 transition"
            >
              {t("common.about")}
            </Link>
            <Link
              href="/"
              className="text-sm text-[#454545] font-medium px-4 py-2 rounded hover:bg-gray-200 transition"
            >
              {t("common.products")}
            </Link>
            <Link
              href="/"
              className="text-sm text-[#454545] font-medium px-4 py-2 rounded hover:bg-gray-200 transition"
            >
              {t("common.forTeams")}
            </Link>
          </div>
          <form className="hidden lg:block flex-grow relative px-3">
            <input
              type="text"
              placeholder={t("common.search")}
              className="w-full max-w-[600px] pl-9 pr-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <Search className="absolute left-4 top-2.5 h-4 w-4 text-gray-600" />
          </form>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector />
           {!hasMounted ? null : !user ? (
            <Link
              href="/auth"
              className="text-sm font-medium text-[#454545] bg-[#e7f8fe] hover:bg-[#d3e4eb] border border-blue-500 px-4 py-1.5 rounded transition"
            >
              {t("common.login")}
            </Link>
          ) : (
            <>
              <Link
                href={`/users/${user._id}`}
                className="flex items-center justify-center bg-orange-600 text-white text-sm font-semibold w-9 h-9 rounded-full"
              >
                {user.name?.charAt(0).toUpperCase()}
              </Link>

              <button
                onClick={handlelogout}
                className="text-sm font-medium text-[#454545] bg-[#e7f8fe] hover:bg-[#d3e4eb] border border-blue-500 px-4 py-1.5 rounded transition"
              >
                {t("common.logout")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
