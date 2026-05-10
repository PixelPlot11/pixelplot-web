// src/hooks/useSupabase.js
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { shortAddr } from "../lib/gameData";

export function useSupabase() {
  const [profile, setProfile]         = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [savingProfile, setSaving]    = useState(false);

  const loadProfile = useCallback(async (address) => {
    const wallet = address.toLowerCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet", wallet)
      .maybeSingle();

    if (error) console.error("loadProfile:", error);

    if (data) { setProfile(data); return data; }

    // New player
    const { data: created, error: insertErr } = await supabase
      .from("profiles")
      .insert({
        wallet,
        username:        shortAddr(address),
        avatar:          "🧑‍🌾",
        exp:             0,
        pending_earnings: 0,
        total_harvested: 0,
        total_earned:    0,
      })
      .select()
      .maybeSingle();

    if (insertErr) console.error("createProfile:", insertErr);
    if (created) setProfile(created);
    return created;
  }, []);

  // Refresh profile dari Supabase (dipanggil setelah harvest)
  const refreshProfile = useCallback(async (address) => {
    if (!address) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet", address.toLowerCase())
      .maybeSingle();
    if (error) { console.error("refreshProfile:", error); return; }
    if (data) setProfile(data);
    return data;
  }, []);

  const saveProfile = useCallback(async (address, username, avatar) => {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ username, avatar })
      .eq("wallet", address.toLowerCase())
      .select()
      .maybeSingle();
    if (error) console.error("saveProfile:", error);
    if (data) setProfile(data);
    setSaving(false);
    return data;
  }, []);

  const updateProfileLocal = useCallback((updates) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("wallet, username, avatar, exp, total_harvested, total_earned, pending_earnings")
      .order("exp", { ascending: false })
      .limit(20);
    if (error) console.error("leaderboard:", error);
    setLeaderboard(data || []);
    setLbLoading(false);
  }, []);

  const clearProfile = useCallback(() => setProfile(null), []);

  return {
    profile, leaderboard, lbLoading, savingProfile,
    loadProfile, refreshProfile, saveProfile,
    updateProfileLocal, loadLeaderboard, clearProfile,
  };
}
