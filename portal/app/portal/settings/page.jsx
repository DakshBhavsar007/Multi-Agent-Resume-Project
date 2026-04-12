"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePortalAuthStore } from "../../../stores/portalAuthStore";
import { Save, Lock, Tags, AlertOctagon, X, Key, ExternalLink, ChevronRight } from "lucide-react";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  const { company_name, developer, initFromStorage } = usePortalAuthStore();
  const router = useRouter();
  
  const [profile, setProfile] = useState({ name: company_name || "", website: "" });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  
  const [domains, setDomains] = useState(["hrms.yourcompany.com"]);
  const [newDomain, setNewDomain] = useState("");

  const handleProfileSave = (e) => {
    e.preventDefault();
    toast.success("Profile updated");
  };

  const handlePasswordSave = (e) => {
    e.preventDefault();
    if(passwords.newPass !== passwords.confirm) return toast.error("Passwords do not match");
    toast.success("Password secured");
    setPasswords({ current: "", newPass: "", confirm: "" });
  };

  const addDomain = (e) => {
    e.preventDefault();
    if(newDomain && !domains.includes(newDomain)) {
       setDomains([...domains, newDomain]);
       setNewDomain("");
       toast.success("Domain added");
    }
  };

  const handleAccountDelete = () => {
    const email = window.prompt(`To permanently delete your account, type your email (${developer?.email || 'admin@company.com'}) below:`);
    if (email === developer?.email || email) {
      toast.error("Account scheduled for deletion.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 flex flex-col gap-8">
      
      <div>
         <h1 className="text-3xl font-black text-charcoal">Settings</h1>
         <p className="text-gray-500 font-medium mt-1">Manage your developer account preferences and security.</p>
      </div>

      {/* API Key Auth Link */}
      <button
        onClick={() => router.push("/portal/settings/api-keys")}
        className="w-full bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:shadow-md hover:border-amber-300 transition-all group text-left"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-accent/10 rounded-xl">
            <Key size={22} className="text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-charcoal text-base">API Key Authentication</h3>
            <p className="text-sm text-gray-500 font-medium">Generate keys and open the Vishleshan Dashboard instantly</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-gray-400 group-hover:text-accent group-hover:translate-x-1 transition-all" />
      </button>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Save size={20}/></div>
          <h2 className="text-xl font-bold text-charcoal">Profile Settings</h2>
        </div>
        <form onSubmit={handleProfileSave} className="flex flex-col gap-5 max-w-lg">
          <div className="flex flex-col gap-1.5">
             <label className="text-sm font-semibold text-gray-600">Company / Workspace Name</label>
             <input type="text" value={profile.name} onChange={e=>setProfile({...profile, name: e.target.value})} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent outline-none font-medium" />
          </div>
          <div className="flex flex-col gap-1.5">
             <label className="text-sm font-semibold text-gray-600">Developer Email</label>
             <input type="email" readOnly value={developer?.email || "developer@example.com"} className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-400 outline-none font-medium cursor-not-allowed" />
          </div>
          <div className="flex flex-col gap-1.5 mb-2">
             <label className="text-sm font-semibold text-gray-600">Website URL</label>
             <input type="url" placeholder="https://" value={profile.website} onChange={e=>setProfile({...profile, website: e.target.value})} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent outline-none font-medium" />
          </div>
          <button type="submit" className="w-fit bg-accent text-white px-6 py-2.5 rounded-xl font-bold hover:bg-accent-dark transition-all">Save Changes</button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Lock size={20}/></div>
          <h2 className="text-xl font-bold text-charcoal">Security</h2>
        </div>
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-5 max-w-lg">
          <div className="flex flex-col gap-1.5">
             <label className="text-sm font-semibold text-gray-600">Current Password</label>
             <input type="password" required value={passwords.current} onChange={e=>setPasswords({...passwords, current:e.target.value})} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-charcoal outline-none font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
             <label className="text-sm font-semibold text-gray-600">New Password</label>
             <input type="password" required value={passwords.newPass} onChange={e=>setPasswords({...passwords, newPass:e.target.value})} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-charcoal outline-none font-mono" />
          </div>
          <div className="flex flex-col gap-1.5 mb-2">
             <label className="text-sm font-semibold text-gray-600">Confirm New Password</label>
             <input type="password" required value={passwords.confirm} onChange={e=>setPasswords({...passwords, confirm:e.target.value})} className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-charcoal outline-none font-mono" />
          </div>
          <button type="submit" className="w-fit border-2 border-charcoal text-charcoal px-6 py-2.5 rounded-xl font-bold hover:bg-gray-100 transition-all">Update Password</button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Tags size={20}/></div>
          <h2 className="text-xl font-bold text-charcoal">Globally Allowed Domains</h2>
        </div>
        <p className="text-sm text-gray-500 font-medium mb-6">Cross-Origin Resource Sharing (CORS) whitelists domains restricted from making frontend Embed API requests.</p>
        <div className="max-w-xl">
           <div className="flex flex-wrap gap-2 mb-4">
             {domains.map(d => (
                <div key={d} className="flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg text-sm font-bold text-gray-600">
                  {d}
                  <button type="button" onClick={() => setDomains(domains.filter(x => x!==d))} className="text-gray-400 hover:text-red-500 transition-colors ml-1"><X size={14}/></button>
                </div>
             ))}
             {domains.length === 0 && <span className="text-sm text-gray-400 font-medium italic py-1.5">No domains configured.</span>}
           </div>
           <form onSubmit={addDomain} className="flex gap-3">
              <input type="text" placeholder="api.company.com" value={newDomain} onChange={e=>setNewDomain(e.target.value)} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-accent outline-none font-medium" />
              <button type="submit" className="border-2 border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-all">Add Server</button>
           </form>
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 rounded-lg text-red-500"><AlertOctagon size={20}/></div>
          <h2 className="text-xl font-bold text-red-600">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-800/80 font-medium mb-6">Permanently delete your entire workspace, API keys, parsing history, and candidate databases. This action is irreversible.</p>
        <button onClick={handleAccountDelete} className="bg-red-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-600 transition-all shadow-md shadow-red-500/20">Delete Workspace Permanently</button>
      </div>

    </div>
  );
}
