import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Users, Package, Send, Clock, ArrowLeft, Plus, Search, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { vigilSupabase } from "@/integrations/vigil/client";

interface Household {
  id: string;
  name: string;
}

interface CommViewProps {
  household: Household | null;
  currentUserId: string | null;
  inventory?: any[];
}

interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  expiry_date?: string;
  manufacturing_date?: string;
  status?: "in" | "opened" | "out";
  is_out?: boolean;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  mode: "s-comm" | "b-comm";
  status: "active" | "pending" | "completed" | "cancelled";
  lister_id: string;
  lister_name: string;
  item_name?: string;
  quantity?: number;
  unit?: string | null;
  expiry_date?: string;
  created_at: string;
  updated_at: string;
}

interface Request {
  id: string;
  listing_id: string;
  requester_id: string;
  requester_name: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at?: string;
}

interface Chat {
  id: string;
  listing_id: string;
  participant1_id: string;
  participant2_id: string;
  participant1_name: string;
  participant2_name: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export const CommView = ({ household, currentUserId, inventory = [] }: CommViewProps) => {
  const [activeMode, setActiveMode] = useState<"s-comm" | "b-comm">("s-comm");
  const [activeView, setActiveView] = useState<"browse" | "inventory" | "my-listings" | "requests" | "chat">("browse");

  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const categories = useMemo(() => ["all", "food", "clothing", "electronics", "books", "household", "other"], []);
  const conditions = useMemo(() => ["new", "like-new", "good", "fair", "poor"], []);

  useEffect(() => {
    void fetchListings();
    void fetchRequests();
    void fetchChats();
  }, [activeMode, currentUserId]);

  useEffect(() => {
    if (!selectedChat) return;
    void fetchMessages(selectedChat.id);
  }, [selectedChat]);

  const LISTING_COLUMNS = "id,title,description,category,condition,status,lister_id,lister_name,item_name,quantity,unit,expiry_date,created_at,updated_at,mode";

  const fetchListings = async (modeOverride?: "s-comm" | "b-comm") => {
    setLoading(true);
    try {
      const targetMode = modeOverride ?? activeMode;
      // Select explicit columns to avoid PostgreSQL mode() aggregate name clash
      const { data, error } = await vigilSupabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      // mode column must be fetched separately or inferred; re-fetch with raw approach
      // Actually fetch all data without the problematic column, then get mode via RPC or raw
      // Workaround: fetch without select to get all columns - but that triggers the bug
      // Best approach: just fetch all and handle the error, or fetch mode separately
      setListings(((data as any[]) || []).filter((l: any) => l.mode === targetMode) as Listing[]);
    } catch (error) {
      // If explicit columns fail (e.g., some columns don't exist), try minimal fetch
      try {
        const { data } = await vigilSupabase
          .from("listings")
          .select("id,title,description,condition,status,lister_id,lister_name,item_name,quantity,unit,expiry_date,created_at,updated_at,mode")
          .eq("status", "active")
          .order("created_at", { ascending: false });
        const targetMode = modeOverride ?? activeMode;
        setListings(((data as any[]) || []).filter((l: any) => l.mode === targetMode) as Listing[]);
      } catch (e2) {
        console.error("Error fetching listings:", e2);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await vigilSupabase
        .from("requests")
        .select("*")
        .or(`requester_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data as Request[]) || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  };

  const fetchChats = async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await vigilSupabase
        .from("chats")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.warn("Chats table may not exist yet:", error.message);
        return;
      }
      // Filter client-side for participant matching
      const userChats = ((data as any[]) || []).filter(
        (c: any) => c.participant1_id === currentUserId || c.participant2_id === currentUserId
      );
      setChats(userChats as Chat[]);
    } catch (error) {
      console.error("Error fetching chats:", error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const { data, error } = await vigilSupabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const createListing = async (formData: any) => {
    if (!currentUserId) {
      setError("User not authenticated. Please sign in to create a listing.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const chosenMode: "s-comm" | "b-comm" = (formData?.mode ?? activeMode) as any;
      
      // Prepare the data for insertion (omit 'category' as it may not exist in the external DB)
      const listingData: Record<string, any> = {
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        mode: chosenMode,
        lister_id: currentUserId,
        lister_name: household?.name || "Anonymous",
        status: "active",
        item_name: formData.item_name || null,
        quantity: formData.quantity || 1,
        unit: formData.unit || null,
        expiry_date: formData.expiry_date || null,
      };
      // Only include category if the table supports it
      if (formData.category) {
        listingData.category = formData.category;
      }

      // Don't use .select() after insert to avoid mode() aggregate clash
      const { error } = await vigilSupabase
        .from("listings")
        .insert(listingData);

      if (error) {
        console.error("Database error:", error);
        // If category column doesn't exist, retry without it
        if (error.message?.includes("category")) {
          delete listingData.category;
          const retry = await vigilSupabase.from("listings").insert(listingData);
          if (retry.error) {
            setError(`Failed to create listing: ${retry.error.message}`);
            throw retry.error;
          }
          console.log("Listing created successfully (without category)");
          setSuccess("Listing created successfully!");
          setShowCreateForm(false);
          setSelectedInventoryItem(null);
          setActiveMode(chosenMode);
          await fetchListings(chosenMode);
          return;
        }
        setError(`Failed to create listing: ${error.message}`);
        throw error;
      }

      console.log("Listing created successfully");
      setSuccess("Listing created successfully!");

      setShowCreateForm(false);
      setSelectedInventoryItem(null);
      setActiveMode(chosenMode);
      await fetchListings(chosenMode);
    } catch (error) {
      console.error("Error creating listing:", error);
      setError("Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (listingId: string, message: string) => {
    if (!currentUserId) {
      console.error("User not authenticated");
      return;
    }

    try {
      const requestData = {
        listing_id: listingId,
        requester_id: currentUserId,
        requester_name: household?.name || "Anonymous",
        message: message.trim(),
        status: "pending",
      };

      const { data, error } = await vigilSupabase
        .from("requests")
        .insert(requestData)
        .select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Request created successfully:", data);
      await fetchRequests();
    } catch (error) {
      console.error("Error creating request:", error);
      // You might want to show an error message to the user here
    }
  };

  const sendMessage = async () => {
    if (!selectedChat || !currentUserId) return;
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        chat_id: selectedChat.id,
        sender_id: currentUserId,
        sender_name: household?.name || "Anonymous",
        content: newMessage.trim(),
      };

      const { data, error } = await vigilSupabase
        .from("messages")
        .insert(messageData)
        .select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Message sent successfully:", data);
      setNewMessage("");
      await fetchMessages(selectedChat.id);
    } catch (error) {
      console.error("Error sending message:", error);
      // You might want to show an error message to the user here
    }
  };

  const filteredListings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesSearch = !q ||
        listing.title.toLowerCase().includes(q) ||
        listing.description.toLowerCase().includes(q);
      const matchesCategory = selectedCategory === "all" || (listing.category && listing.category === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [listings, searchQuery, selectedCategory]);

  const inventoryItems: InventoryItem[] = useMemo(() => {
    return (inventory as InventoryItem[]).filter((item) => {
      if (item?.status) return item.status !== "out";
      if (typeof item?.is_out === "boolean") return !item.is_out;
      return true;
    });
  }, [inventory]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-foreground">Community Marketplace</h1>
          <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">🚧 Under Construction</div>
        </div>
        <p className="text-muted-foreground">Share and exchange items with your community</p>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              ×
            </button>
          </div>
        )}
        
        {success && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            {success}
            <button 
              onClick={() => setSuccess(null)}
              className="ml-2 text-emerald-400 hover:text-emerald-300"
            >
              ×
            </button>
          </div>
        )}
      </div>

      <div className="glass-card p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveMode("s-comm")}
            className={cn(
              "p-4 rounded-xl transition-all duration-300",
              activeMode === "s-comm"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Users className="w-6 h-6 mb-2 mx-auto" />
            <div className="font-semibold">S-Comm</div>
            <div className="text-xs opacity-75">Community Sharing</div>
          </button>
          <button
            onClick={() => setActiveMode("b-comm")}
            className={cn(
              "p-4 rounded-xl transition-all duration-300",
              activeMode === "b-comm"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Package className="w-6 h-6 mb-2 mx-auto" />
            <div className="font-semibold">B-Comm</div>
            <div className="text-xs opacity-75">Secondary Market</div>
          </button>
        </div>
      </div>

      <div className="glass-card p-2">
        <div className="grid grid-cols-5 gap-2">
          {[
            { id: "browse", label: "Browse", icon: Search },
            { id: "inventory", label: "Inventory", icon: Box },
            { id: "my-listings", label: "My Listings", icon: Package },
            { id: "requests", label: "Requests", icon: Clock },
            { id: "chat", label: "Chat", icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={cn(
                "p-3 rounded-xl transition-all duration-300 flex flex-col items-center gap-1",
                activeView === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeView === "browse" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="glass-card p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium transition-all duration-300",
                      selectedCategory === category
                        ? "bg-primary text-primary-foreground"
                        : "bg-background/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setSelectedInventoryItem(null);
                  setShowCreateForm(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create Listing
              </button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading listings...</div>
              ) : filteredListings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No listings found</div>
              ) : (
                filteredListings.map((listing) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card p-4 space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground">{listing.description}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-background/50 rounded-full">{listing.category}</span>
                          <span className="text-xs px-2 py-1 bg-background/50 rounded-full">{listing.condition}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{listing.lister_name}</div>
                        <div className="text-xs text-muted-foreground">{new Date(listing.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => createRequest(listing.id, "I'm interested in this item")}
                      className="w-full py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                    >
                      Request Item
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeView === "inventory" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="glass-card p-4">
              <h3 className="font-semibold text-foreground mb-4">Your Inventory Items</h3>
              <p className="text-sm text-muted-foreground mb-4">Select items from your inventory to create marketplace listings</p>

              {inventoryItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No inventory items available.</div>
              ) : (
                <div className="space-y-3">
                  {inventoryItems.map((item) => (
                    <div key={item.id} className="p-3 bg-background/50 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.category && `Category: ${item.category}`}
                            {item.expiry_date && ` • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedInventoryItem(item);
                            setShowCreateForm(true);
                          }}
                          className="px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                        >
                          List Item
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === "requests" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="glass-card p-4">
              <h3 className="font-semibold text-foreground mb-4">Your Requests</h3>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No requests yet</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div key={request.id} className="p-3 bg-background/50 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{request.requester_name}</div>
                          <div className="text-sm text-muted-foreground">{request.message}</div>
                        </div>
                        <div className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium",
                          request.status === "pending" && "bg-yellow-500/20 text-yellow-400",
                          request.status === "accepted" && "bg-emerald-500/20 text-emerald-400",
                          request.status === "rejected" && "bg-red-500/20 text-red-400",
                        )}>
                          {request.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeView === "chat" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-4"
          >
            {selectedChat ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                  <button
                    onClick={() => setSelectedChat(null)}
                    className="p-2 hover:bg-background/50 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <div className="font-semibold">
                      {selectedChat.participant1_id === currentUserId ? selectedChat.participant2_name : selectedChat.participant1_name}
                    </div>
                    <div className="text-xs text-muted-foreground">Active chat</div>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn("flex", message.sender_id === currentUserId ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-xs p-3 rounded-xl",
                          message.sender_id === currentUserId ? "bg-primary text-primary-foreground" : "bg-background/50",
                        )}
                      >
                        <div className="text-sm">{message.content}</div>
                        <div className="text-xs opacity-75 mt-1">{new Date(message.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    className="flex-1 px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={sendMessage}
                    className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Active Chats</h3>
                {chats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No active chats</div>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className="w-full p-3 bg-background/50 rounded-xl hover:bg-background/70 transition-colors text-left"
                    >
                      <div className="font-medium">
                        {chat.participant1_id === currentUserId ? chat.participant2_name : chat.participant1_name}
                      </div>
                      <div className="text-xs text-muted-foreground">Last active {new Date(chat.updated_at).toLocaleDateString()}</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeView === "my-listings" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="glass-card p-4">
              <h3 className="font-semibold text-foreground mb-4">Your Listings</h3>
              <div className="text-center py-8 text-muted-foreground">Coming soon</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]"
            onClick={() => {
              setShowCreateForm(false);
              setSelectedInventoryItem(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-4 w-full max-w-sm max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-foreground mb-4">Create Listing</h3>
              <CreateListingForm
                onSubmit={createListing}
                onCancel={() => {
                  setShowCreateForm(false);
                  setSelectedInventoryItem(null);
                }}
                loading={loading}
                categories={categories.filter((c) => c !== "all")}
                conditions={conditions}
                initialMode={activeMode}
                prefillData={selectedInventoryItem ? {
                  title: selectedInventoryItem.name,
                  description: `Listing ${selectedInventoryItem.name} from inventory`,
                  item_name: selectedInventoryItem.name,
                  category: selectedInventoryItem.category || "other",
                  expiry_date: selectedInventoryItem.expiry_date || "",
                } : undefined}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CreateListingFormProps {
  onSubmit: (data: any) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
  categories: string[];
  conditions: string[];
  initialMode: "s-comm" | "b-comm";
  prefillData?: {
    title?: string;
    description?: string;
    item_name?: string;
    category?: string;
    expiry_date?: string;
  };
}

const CreateListingForm = ({ onSubmit, onCancel, loading, categories, conditions, initialMode, prefillData }: CreateListingFormProps) => {
  const [formData, setFormData] = useState({
    title: prefillData?.title || "",
    description: prefillData?.description || "",
    category: prefillData?.category || categories[0],
    condition: conditions[0],
    mode: initialMode,
    item_name: prefillData?.item_name || "",
    quantity: 1,
    unit: "pcs" as string,
    expiry_date: prefillData?.expiry_date || "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      title: prefillData?.title ?? prev.title,
      description: prefillData?.description ?? prev.description,
      category: prefillData?.category ?? prev.category,
      item_name: prefillData?.item_name ?? prev.item_name,
      expiry_date: prefillData?.expiry_date ?? prev.expiry_date,
    }));
  }, [prefillData?.title, prefillData?.description, prefillData?.category, prefillData?.item_name, prefillData?.expiry_date]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Listing type</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, mode: "s-comm" })}
            className={cn(
              "py-2 rounded-xl font-medium transition-all",
              formData.mode === "s-comm"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-background/50 text-muted-foreground hover:text-foreground border border-border/50"
            )}
          >
            S-Comm
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, mode: "b-comm" })}
            className={cn(
              "py-2 rounded-xl font-medium transition-all",
              formData.mode === "b-comm"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                : "bg-background/50 text-muted-foreground hover:text-foreground border border-border/50"
            )}
          >
            B-Comm
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Title</label>
        <input
          type="text"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Description</label>
        <textarea
          required
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Item Name</label>
          <input
            type="text"
            value={formData.item_name}
            onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
            className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) })}
              className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-28 px-3 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="pcs">pcs</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="pack">pack</option>
              <option value="box">box</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Expiry Date (optional)</label>
        <input
          type="date"
          value={formData.expiry_date}
          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
          className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 py-2 bg-background/50 text-foreground rounded-xl hover:bg-background/70 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-purple-500 text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </div>
    </form>
  );
};
