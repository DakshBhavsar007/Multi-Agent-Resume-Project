import React from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import PageTransition from '../components/PageTransition';
import { Building, Key, Upload, X } from 'lucide-react';

export default function SettingsPage() {
  const { company } = useAuthStore();
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logo, setLogo] = useState(localStorage.getItem('vish_company_logo') || '');

  const { data: keysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => authAPI.getKeys(),
    retry: false
  });

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo('');
  };

  const handleSave = () => {
    if (logo) {
      localStorage.setItem('vish_company_logo', logo);
    } else {
      localStorage.removeItem('vish_company_logo');
    }
    window.dispatchEvent(new Event('company_logo_updated'));
    toast.success("Settings saved");
  };

  const keys = Array.isArray(keysData) ? keysData : [];

  return (
    <PageTransition className="p-8 max-w-5xl mx-auto py-10 w-full overflow-y-auto h-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-charcoal">Settings</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage your account, API keys, and company profile.</p>
      </div>

      <div className="space-y-6">
        
        {/* SECTION 1: Company Profile */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
            <Building className="w-5 h-5 text-[#C8871A]" /> Company Profile
          </h2>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-1">Admin Email</label>
              <input type="text" value={company?.email || 'N/A'} readOnly className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 font-medium focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-1">Company Name</label>
              <input 
                type="text" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                className="w-full p-2.5 bg-white border-2 border-gray-200 rounded-lg text-sm font-bold text-charcoal focus:outline-none focus:border-[#C8871A]" 
              />
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-1">Company Logo / Profile Image</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                  {logo ? (
                    <>
                      <img src={logo} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={handleRemoveLogo} 
                        className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        title="Remove logo"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <Building className="w-8 h-8 text-gray-300" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="cursor-pointer bg-[#f5f4ef] hover:bg-[#e6dfcd] text-charcoal border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm inline-block w-max">
                    <Upload size={12} className="inline mr-1.5" /> Upload Image
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoChange} 
                      className="hidden" 
                    />
                  </label>
                  <span className="text-[10px] text-gray-400 font-medium">PNG, JPG or SVG up to 2MB</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-1">Account Tier</label>
              <span className="inline-block bg-blue-100/50 border border-blue-200 text-blue-700 font-black px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-widest shadow-sm">
                {company?.tier || 'Free'}
              </span>
            </div>
            <button onClick={handleSave} className="bg-[#2A2A2A] hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors mt-2">
              Save Changes
            </button>
          </div>
        </div>

        {/* SECTION 2: API Keys */}
        <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-charcoal mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#C8871A]" /> API Keys
          </h2>
          {keys.length > 0 ? (
            <div className="space-y-3">
              {keys.map((key, i) => (
                <div key={key.id || i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-4">
                  <div>
                    <span className="font-bold text-sm text-charcoal">{key.key_name || 'API Key'}</span>
                    <div className="text-xs text-gray-500 font-mono mt-1">{key.public_key ? `${key.public_key.slice(0, 12)}...` : 'Hidden'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
                      key.environment === 'production' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>
                      {key.environment || 'production'}
                    </span>
                    <button 
                      onClick={async () => {
                        if (window.confirm("Delete this API key?")) {
                          try {
                            await authAPI.deleteKey(key.id);
                            toast.success("Key deleted");
                          } catch(e) { toast.error(e.message); }
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-xs font-bold px-2 py-1 hover:bg-red-50 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-medium">No API keys generated yet.</p>
              <p className="text-xs mt-1">Keys are created automatically when you register.</p>
            </div>
          )}
        </div>

      </div>
    </PageTransition>
  );
}
