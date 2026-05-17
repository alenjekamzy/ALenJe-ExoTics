import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, onSnapshot, addDoc, 
  deleteDoc, doc, serverTimestamp, getDoc, setDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, 
  onAuthStateChanged, signOut 
} from 'firebase/auth';

// --- Your Provided Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCUxzypGZxXnrRhfO0BiqkgcaSlVdgVON8",
  authDomain: "alenje-exotics.firebaseapp.com",
  projectId: "alenje-exotics",
  storageBucket: "alenje-exotics.firebasestorage.app",
  messagingSenderId: "25574137051",
  appId: "1:25574137051:web:a23b21764cd269560600fe"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'alenje-exotics';

const ADMIN_EMAIL = "kamzyslime7@gmail.com";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    name: '',
    photo: '',
    caption: '',
    phone: ''
  });
  const [view, setView] = useState('menu'); // menu, community, chat, settings, admin
  const [category, setCategory] = useState('All');
  const [inventory, setInventory] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [postImage, setPostImage] = useState("");
  
  // Admin Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Strains', thc: '24', img: '' });

  // Refs for file inputs
  const postFileRef = useRef(null);
  const adminFileRef = useRef(null);
  const profileFileRef = useRef(null);

  // --- Auth & Profile Loading ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Load Profile Data
        const profileRef = doc(db, 'artifacts', appId, 'users', u.uid, 'profile', 'info');
        const snap = await getDoc(profileRef);
        if (snap.exists()) {
          setProfile(snap.data());
        } else {
          // Default profile
          setProfile({
            name: 'Guest Explorer',
            photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`,
            caption: 'Exploring Alenje Exotics',
            phone: ''
          });
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Data Listeners ---
  useEffect(() => {
    if (!user) return;

    const invRef = collection(db, 'artifacts', appId, 'public', 'data', 'inventory');
    const unsubInv = onSnapshot(invRef, (s) => {
      setInventory(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error("Inventory fetch error:", err));

    const postsRef = collection(db, 'artifacts', appId, 'public', 'data', 'community');
    const unsubPosts = onSnapshot(postsRef, (s) => {
      const sorted = s.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setPosts(sorted);
    }, (err) => console.error("Posts fetch error:", err));

    return () => { unsubInv(); unsubPosts(); };
  }, [user]);

  // --- Utility: File to Base64 ---
  const handleFileUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 1048576) {
      return; // Silently fail or use custom UI instead of alert
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- Profile Actions ---
  const saveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'info');
      await setDoc(profileRef, {
        ...profile,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Community Actions ---
  const handlePost = async (e) => {
    e.preventDefault();
    if (!user || (!newPost.trim() && !postImage)) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'community'), {
        text: newPost,
        image: postImage,
        userName: profile.name || 'Guest Explorer',
        userPhoto: profile.photo,
        userPhone: profile.phone,
        timestamp: serverTimestamp(),
        uid: user.uid
      });
      setNewPost("");
      setPostImage("");
    } catch (err) { console.error(err); }
  };

  // --- Admin Actions ---
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'inventory'), {
        ...newItem,
        createdAt: serverTimestamp()
      });
      setNewItem({ name: '', price: '', category: 'Strains', thc: '24', img: '' });
    } catch (err) { console.error(err); }
  };

  const deleteProduct = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'inventory', id));
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-emerald-500 font-black uppercase text-xs tracking-widest animate-pulse">Identifying...</div>;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${darkMode ? 'bg-[#030303] text-white' : 'bg-[#f8f9fa] text-black'}`}>
      <div className="max-w-[440px] mx-auto px-5 pb-40">
        
        {/* Header */}
        <header className="sticky top-0 z-[100] py-8 flex justify-between items-center bg-transparent backdrop-blur-md">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('menu')}>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="black"><path d="M12,22C12,22 13,17.5 16,14C19,10.5 22,10 22,10C22,10 17.5,11 14,14C12.8,15.2 12,17 12,17C12,17 11.2,15.2 10,14C6.5,11 2,10 2,10C2,10 5,10.5 8,14C11,17.5 12,22 12,22M12,17V12M12,12C12,12 11,8 8,5.5C5,3 2,2 2,2C2,2 5.5,3 8,6C9.5,7.8 10,10 10,10C10,10 11,8 12,7C13,8 14,10 14,10C14,10 14.5,7.8 16,6C18.5,3 22,2 22,2C22,2 19,3 16,5.5C13,8 12,12 12,12Z" /></svg>
            </div>
            <span className="font-black text-lg italic tracking-tighter uppercase text-emerald-500">Alenje Exotics</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="w-12 h-12 bg-white/5 border border-emerald-500/20 backdrop-blur-xl rounded-2xl flex items-center justify-center active:scale-90 transition-all">
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>

        <main>
          {view === 'menu' && (
            <div className="animate-in fade-in duration-700">
              <div className="text-center py-6">
                <h1 className="font-black text-[68px] leading-[0.75] mb-2 tracking-tighter uppercase italic">
                  ALENJE<br/><span className="text-emerald-500">EXOTICS</span>
                </h1>
                <p className="opacity-30 text-[9px] font-black uppercase tracking-[0.5em] mt-4">Premium Logistics & Supply</p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar mb-8">
                {['All', 'Strains', 'Vapes', 'Edibles', 'Gear'].map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setCategory(cat)} 
                    className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${category === cat ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'bg-white/5 opacity-50 border border-emerald-500/10'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid gap-10">
                {inventory.filter(i => category === 'All' || i.category === category).map(item => (
                  <div key={item.id} className="relative bg-white/5 border border-emerald-500/20 rounded-[2.5rem] overflow-hidden">
                    <div className="relative h-[400px]">
                      <img src={item.img || "https://images.unsplash.com/photo-1536633314979-d204bfce4602?w=800"} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"></div>
                      <div className="absolute top-6 right-6 bg-emerald-500 text-black px-4 py-2 rounded-full font-black text-[10px] uppercase shadow-xl">
                        {item.thc || '24'}% THC
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">{item.category}</span>
                          <h3 className="font-black text-3xl uppercase italic leading-none">{item.name}</h3>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black italic text-emerald-500">MWK {item.price}</span>
                        </div>
                      </div>
                      <button onClick={() => setView('chat')} className="w-full py-5 bg-emerald-500 rounded-2xl flex items-center justify-center font-black text-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                        Secure Order
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'admin' && (
            <div className="animate-in slide-in-from-right-10 duration-500">
              <h2 className="font-black text-5xl mb-8 uppercase italic leading-[0.8]">VAULT<br/><span className="text-emerald-500">CONTROL</span></h2>
              
              <form onSubmit={handleAddProduct} className="bg-white/5 border border-emerald-500/20 p-8 rounded-[2.5rem] mb-12 space-y-4">
                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-2">New Arrival Details</p>
                <div onClick={() => adminFileRef.current.click()} className="w-full h-40 bg-black/40 border-2 border-dashed border-emerald-500/20 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-500/5 transition-all overflow-hidden">
                  {newItem.img ? <img src={newItem.img} className="w-full h-full object-cover" /> : <><CameraIcon /><span className="text-[10px] font-black uppercase mt-2 opacity-40">Tap to Upload Photo</span></>}
                  <input type="file" accept="image/*" ref={adminFileRef} className="hidden" onChange={(e) => handleFileUpload(e, (res) => setNewItem({...newItem, img: res}))} />
                </div>
                <input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Strain Name" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
                <div className="flex gap-4">
                  <input value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder="Price (MWK)" className="flex-1 bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
                  <input value={newItem.thc} onChange={e => setNewItem({...newItem, thc: e.target.value})} placeholder="THC %" className="w-32 bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
                </div>
                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-sm font-bold outline-none text-white/60">
                  <option value="Strains">Strains</option><option value="Vapes">Vapes</option><option value="Edibles">Edibles</option><option value="Gear">Gear</option>
                </select>
                <button className="w-full py-5 bg-emerald-500 text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20">Add to Inventory</button>
              </form>

              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase opacity-40 tracking-widest">Active Stock ({inventory.length})</p>
                {inventory.map(item => (
                  <div key={item.id} className="flex items-center gap-4 bg-white/5 border border-white/5 p-4 rounded-2xl group">
                    <img src={item.img || "https://images.unsplash.com/photo-1536633314979-d204bfce4602?w=100"} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm uppercase italic">{item.name}</h4>
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-tighter">MWK {item.price} • {item.category}</p>
                    </div>
                    <button onClick={() => deleteProduct(item.id)} className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'community' && (
            <div className="animate-in fade-in duration-500">
              <h2 className="font-black text-5xl mb-8 uppercase italic leading-[0.8]">LOCAL<br/><span className="text-emerald-500">VIBE</span></h2>
              <form onSubmit={handlePost} className="mb-12">
                <div className="bg-white/5 border border-emerald-500/20 p-6 rounded-[2.5rem]">
                  <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Show the community what you got..." className="w-full bg-transparent outline-none text-sm font-semibold resize-none mb-4 min-h-[80px]" />
                  {postImage && <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 border border-emerald-500/20"><img src={postImage} className="w-full h-full object-cover" /><button type="button" onClick={() => setPostImage("")} className="absolute top-2 right-2 w-8 h-8 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white">✕</button></div>}
                  <div className="flex justify-between items-center">
                    <button type="button" onClick={() => postFileRef.current.click()} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-emerald-500 hover:bg-emerald-500/10 transition-all"><CameraIcon /><input type="file" accept="image/*" ref={postFileRef} className="hidden" onChange={(e) => handleFileUpload(e, setPostImage)} /></button>
                    <button className="px-10 py-4 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-2xl active:scale-95 transition-all">Post</button>
                  </div>
                </div>
              </form>
              <div className="space-y-12">
                {posts.map(post => (
                  <div key={post.id} className="border-b border-white/5 pb-10">
                    <div className="flex items-center gap-4 mb-5">
                      <img src={post.userPhoto} className="w-10 h-10 rounded-xl bg-zinc-800 object-cover border border-emerald-500/20" />
                      <div>
                        <h4 className="font-bold text-xs uppercase tracking-tight">{post.userName}</h4>
                        <div className="flex items-center gap-2">
                           <p className="text-[9px] opacity-40 uppercase font-black tracking-widest">{post.timestamp ? new Date(post.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</p>
                           {post.userPhone && <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black">{post.userPhone}</span>}
                        </div>
                      </div>
                    </div>
                    {post.image && <div className="rounded-[2rem] overflow-hidden mb-5 border border-white/5 shadow-2xl"><img src={post.image} className="w-full h-auto max-h-[500px] object-cover" /></div>}
                    <p className="text-sm font-medium opacity-80 leading-relaxed italic">{post.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div className="animate-in slide-in-from-bottom-10 duration-500">
              <h2 className="font-black text-5xl mb-12 italic uppercase">USER<br/><span className="text-emerald-500">VAULT</span></h2>
              <div className="bg-white/5 border border-emerald-500/20 rounded-[2.5rem] p-8 space-y-8">
                
                {/* Profile Editor */}
                <div className="space-y-6">
                  <div className="flex flex-col items-center">
                    <div onClick={() => profileFileRef.current.click()} className="relative w-32 h-32 mb-4 group cursor-pointer">
                       <img src={profile.photo} className="w-full h-full rounded-[2.5rem] object-cover border-4 border-emerald-500 shadow-xl shadow-emerald-500/20" />
                       <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase">Change</div>
                       <input type="file" accept="image/*" ref={profileFileRef} className="hidden" onChange={(e) => handleFileUpload(e, (res) => setProfile({...profile, photo: res}))} />
                    </div>
                    <p className="text-[10px] font-black uppercase opacity-30 tracking-widest">Global Identity</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500 ml-2">Display Name</label>
                      <input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} placeholder="Ex: Kamzy Slime" className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500 ml-2">Mobile Number (For Logistics)</label>
                      <input value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} placeholder="+265..." className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500 ml-2">Profile Caption</label>
                      <textarea value={profile.caption} onChange={e => setProfile({...profile, caption: e.target.value})} placeholder="Tell us your vibe..." className="w-full bg-black/40 border border-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-emerald-500 resize-none h-20" />
                    </div>
                  </div>

                  <button 
                    disabled={isSavingProfile}
                    onClick={saveProfile}
                    className="w-full py-5 bg-emerald-500 text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Updating Vault...' : 'Update Identity'}
                  </button>
                </div>

                <div className="pt-8 border-t border-white/5 space-y-4">
                  <button onClick={() => setView('admin')} className="w-full flex justify-between items-center py-5 px-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group hover:bg-emerald-500/20 transition-all">
                    <span className="text-[10px] font-black uppercase tracking-widest">Admin Dashboard</span>
                    <SettingsIcon />
                  </button>
                  <button onClick={() => signOut(auth)} className="w-full py-5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl border border-red-500/20 active:bg-red-500/20 transition-all">Disconnect Session</button>
                </div>
              </div>
            </div>
          )}

          {(view === 'chat') && (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-500/10 rounded-[3rem] border border-emerald-500/30 flex items-center justify-center mb-10">
                <svg width="36" height="36" className="text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              </div>
              <h2 className="font-black text-5xl mb-6 leading-none italic uppercase">SECURE<br/><span className="text-emerald-500">TUNNEL</span></h2>
              <p className="opacity-40 text-[10px] font-black uppercase tracking-[0.3em] mb-16 text-center">Connected as: <span className="text-emerald-500">{profile.name}</span></p>
              <button onClick={() => setView('menu')} className="w-full max-w-[240px] py-6 bg-white/5 rounded-3xl text-[10px] font-black uppercase tracking-widest border border-white/10 active:scale-95 transition-all">Return Home</button>
            </div>
          )}
        </main>

        <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] bg-black/60 backdrop-blur-3xl border border-emerald-500/20 rounded-[2.5rem] p-2 flex justify-around items-center z-[200] shadow-2xl">
          <button onClick={() => setView('menu')} className={`flex-1 py-4 flex items-center justify-center rounded-3xl transition-all ${view === 'menu' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'opacity-20'}`}>
            <HomeIcon />
          </button>
          <button onClick={() => setView('community')} className={`flex-1 py-4 flex items-center justify-center rounded-3xl transition-all ${view === 'community' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'opacity-20'}`}>
            <UsersIcon />
          </button>
          <button onClick={() => setView('chat')} className={`flex-1 py-4 flex items-center justify-center rounded-3xl transition-all ${view === 'chat' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'opacity-20'}`}>
            <ChatIcon />
          </button>
          <button onClick={() => setView('settings')} className={`flex-1 py-4 flex items-center justify-center rounded-3xl transition-all ${view === 'settings' || view === 'admin' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30' : 'opacity-20'}`}>
            <SettingsIcon />
          </button>
        </nav>
      </div>
    </div>
  );
}

// --- Icons ---
const HomeIcon = () => <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
const UsersIcon = () => <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;
const ChatIcon = () => <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>;
const SettingsIcon = () => <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>;
const SunIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>;
const MoonIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12.1 22c4.9 0 9-3.6 10-8.3.2-1.1-.9-1.9-1.8-1.5-1.1.5-2.2.8-3.5.8-4.4 0-8-3.6-8-8 0-1.2.3-2.4.8-3.5.4-.9-.4-1.9-1.5-1.8C3.6 1 0 5.1 0 10c0 6.6 5.4 12 12.1 12z"/></svg>;
const CameraIcon = () => <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5z"/></svg>;
const TrashIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round"/></svg>;
