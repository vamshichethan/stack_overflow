import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { Calendar, Edit, Plus, X } from "lucide-react";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
const getUserData = (id: string) => {
  const users = {
    "1": {
      id: 1,
      name: "John Doe",
      joinDate: "2019-03-15",
      about:
        "Full-stack developer with 8+ years of experience in JavaScript, React, and Node.js. Passionate about clean code and helping others learn programming. I enjoy working on open-source projects and contributing to the developer community.",
      tags: [
        "javascript",
        "react",
        "node.js",
        "typescript",
        "python",
        "mongodb",
      ],
    },
  };
  return users[id as keyof typeof users] || users["1"];
};

const formatLoginTime = (value: string) => {
  if (!value) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const formatPointsTime = (value: string) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const index = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [users, setusers] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pointsData, setPointsData] = useState<{
    points: number;
    pointsHistory: any[];
  }>({ points: 0, pointsHistory: [] });
  const [pointsLoading, setPointsLoading] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");
  const [selectedTransferUser, setSelectedTransferUser] = useState<any>(null);
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    about: "",
    tags: [] as string[],
  });
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const fetchuser = async () => {
      try {
        const res = await axiosInstance.get("/user/getalluser");
        setAllUsers(res.data.data || []);
        const matcheduser = res.data.data.find((u: any) => u._id === id);
        setusers(matcheduser);
        if (matcheduser) {
          setEditForm({
            name: matcheduser.name || "",
            about: matcheduser.about || "",
            tags: matcheduser.tags || [],
          });
        }
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchuser();
  }, [id]);

  useEffect(() => {
    const fetchLoginHistory = async () => {
      if (!user?._id || id !== user._id) {
        setLoginHistory([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const res = await axiosInstance.get("/user/login-history");
        setLoginHistory(res.data.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchLoginHistory();
  }, [id, user?._id]);

  useEffect(() => {
    const fetchPoints = async () => {
      if (!user?._id || id !== user._id) {
        setPointsData({
          points: Number(users?.points || 0),
          pointsHistory: [],
        });
        return;
      }

      setPointsLoading(true);
      try {
        const res = await axiosInstance.get("/points/me");
        setPointsData(res.data.data || { points: 0, pointsHistory: [] });
      } catch (error) {
        console.log(error);
      } finally {
        setPointsLoading(false);
      }
    };

    fetchPoints();
  }, [id, user?._id, users?.points]);

  const transferCandidates = allUsers
    .filter((profileUser: any) => profileUser._id !== user?._id)
    .filter((profileUser: any) => {
      const search = transferSearch.trim().toLowerCase();

      if (!search) {
        return true;
      }

      return (
        profileUser.name?.toLowerCase().includes(search) ||
        profileUser.email?.toLowerCase().includes(search)
      );
    })
    .slice(0, 5);

  const handleTransferPoints = async () => {
    const amount = Number(transferAmount);

    if (!selectedTransferUser) {
      toast.error("Please select a user to transfer points.");
      return;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error("Transfer amount must be positive.");
      return;
    }

    setTransferLoading(true);
    try {
      const res = await axiosInstance.post("/points/transfer", {
        recipientId: selectedTransferUser._id,
        points: amount,
      });

      setPointsData(res.data.data);
      setusers((currentUser: any) => ({
        ...currentUser,
        points: res.data.data.points,
      }));
      setTransferAmount("");
      setTransferSearch("");
      setSelectedTransferUser(null);
      toast.success(res.data.message || "Points transferred successfully.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to transfer points.");
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <Mainlayout>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </Mainlayout>
    );
  }
  if (!users || users.length === 0) {
    return <div className="text-center text-gray-500 mt-4">No user found.</div>;
  }

  const handleSaveProfile = async () => {
    try {
      const res = await axiosInstance.patch(`/user/update/${user?._id}`, {
        editForm,
      });
      if (res.data.data) {
        const updatedUser = {
          ...users,
          name: editForm.name,
          about: editForm.about,
          tags: editForm.tags,
        };

        setusers(updatedUser);
        setIsEditing(false);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      console.log(error);
      toast.error("Something went wrong");
    }
  };

  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !editForm.tags.includes(trimmedTag)) {
      setEditForm({ ...editForm, tags: [...editForm.tags, trimmedTag] });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm({
      ...editForm,
      tags: editForm.tags.filter((tag: any) => tag !== tagToRemove),
    });
  };

  const currentUserId = user?._id;
  const isOwnProfile = id === currentUserId;
  const displayPoints = isOwnProfile
    ? Number(pointsData.points || 0)
    : Number(users.points || 0);
  return (
    <Mainlayout>
      <div className="max-w-6xl">
        {/* User Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
          <Avatar className="w-24 h-24 lg:w-32 lg:h-32">
            <AvatarFallback className="text-2xl lg:text-3xl">
              {users.name
                .split(" ")
                .map((n: any) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-1">
                  {users.name}
                </h1>
                <div className="inline-flex items-center rounded border border-orange-200 bg-orange-50 px-2 py-1 text-sm font-semibold text-orange-800">
                  {displayPoints} reward points
                </div>
              </div>

              {isOwnProfile && (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white text-gray-900">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Basic Information
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Display Name</Label>
                            <Input
                              id="name"
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Your display name"
                            />
                          </div>
                        </div>
                      </div>
                      {/* About Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">About</h3>
                        <div>
                          <Label htmlFor="about">About Me</Label>
                          <Textarea
                            id="about"
                            value={editForm.about}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                about: e.target.value,
                              })
                            }
                            placeholder="Tell us about yourself, your experience, and interests..."
                            className="min-h-32"
                          />
                        </div>
                      </div>

                      {/* Tags/Skills Section */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold">
                          Skills & Technologies
                        </h3>

                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Input
                              value={newTag}
                              onChange={(e) => setNewTag(e.target.value)}
                              placeholder="Add a skill or technology"
                              onKeyPress={(e) =>
                                e.key === "Enter" && handleAddTag()
                              }
                            />
                            <Button
                              onClick={handleAddTag}
                              variant="outline"
                              size="sm"
                              className="bg-orange-600 text-white"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {editForm.tags.map((tag: any) => {
                              return (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="bg-orange-100 text-orange-800 flex items-center gap-1"
                                >
                                  {tag}
                                  <button
                                    onClick={() => handleRemoveTag(tag)}
                                    className="ml-1 hover:text-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          className="bg-white text-gray-800 hover:text-gray-900"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Member since{" "}
                {users.joinDate ? new Date(users.joinDate).toISOString().split("T")[0] : "N/A"}
              </div>
            </div>
            <div className="flex flex-wrap items-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span className="font-semibold">5</span>
                <span className="text-gray-600 ml-1">gold badges</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span className="font-semibold">23</span>
                <span className="text-gray-600 ml-1">silver badges</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-600 rounded-full mr-2"></div>
                <span className="font-semibold">45</span>
                <span className="text-gray-600 ml-1">bronze badges</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1  gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {users.about}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(users.tags || []).map((tag: string) => (
                    <div
                      key={tag}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 hover:bg-blue-200 cursor-pointer"
                        >
                          {tag}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Reward Points</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Available points</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {pointsLoading ? "..." : displayPoints}
                    </p>
                  </div>
                  <div className="rounded border border-gray-200 px-3 py-2 text-sm text-gray-700">
                    Transfers require more than 10 points.
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Transfer points
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_160px_auto] gap-3">
                    <div>
                      <Label htmlFor="transferSearch">Search user</Label>
                      <Input
                        id="transferSearch"
                        value={transferSearch}
                        onChange={(e) => {
                          setTransferSearch(e.target.value);
                          setSelectedTransferUser(null);
                        }}
                        placeholder="Search by name or email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="transferAmount">Points</Label>
                      <Input
                        id="transferAmount"
                        type="number"
                        min="1"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        placeholder="10"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={handleTransferPoints}
                        disabled={transferLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {transferLoading ? "Transferring..." : "Transfer"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {transferCandidates.map((profileUser: any) => (
                      <button
                        key={profileUser._id}
                        type="button"
                        onClick={() => {
                          setSelectedTransferUser(profileUser);
                          setTransferSearch(profileUser.name);
                        }}
                        className={`rounded border px-3 py-2 text-sm transition ${
                          selectedTransferUser?._id === profileUser._id
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {profileUser.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Points history
                  </h3>
                  {pointsData.pointsHistory.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      No points history available yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pointsData.pointsHistory.slice(0, 8).map((entry: any) => (
                        <div
                          key={`${entry.createdAt}-${entry.type}-${entry.points}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b pb-3 last:border-b-0"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {entry.description}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatPointsTime(entry.createdAt)}
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold ${
                              Number(entry.points || 0) >= 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {Number(entry.points || 0) > 0 ? "+" : ""}
                            {entry.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {isOwnProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Login History</CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <p className="text-sm text-gray-600">
                    Loading login history...
                  </p>
                ) : loginHistory.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    No login history available yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-gray-600">
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">
                            Browser
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">
                            OS
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">
                            Device
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">
                            IP Address
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">
                            Login Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loginHistory.map((entry: any, index: number) => (
                          <tr
                            key={`${entry.loginAt}-${index}`}
                            className="border-b last:border-b-0"
                          >
                            <td className="whitespace-nowrap px-3 py-3">
                              {entry.browser || "Unknown"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {entry.os || "Unknown"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 capitalize">
                              {entry.device || "desktop"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {entry.ipAddress || "Unknown"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              {formatLoginTime(entry.loginAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Mainlayout>
  );
};

export default index;
