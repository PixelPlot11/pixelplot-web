// src/hooks/useSupabase.js
import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { shortAddr } from "../lib/gameData";

export function useSupabase() {
  const [profile, setProfile]         = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading]     = useState(false);
  const [savingProfile, setSaving]    = useState(false);

  // Load or create profile
  const loadProfile = useCallback(async (address) => {
    const wallet = address.toLowerCase();

    // maybeSingle() returns null instead of 406 when no row found
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("wallet", wallet)
      .maybeSingle();

    if (error) console.error("loadProfile error:", error);

    if (data) {
      setProfile(data);
      return data;
    }

    // New player — create profile
    const { data: created, error: insertErr } = await supabase
      .from("profiles")
      .insert({
        wallet,
        username:        shortAddr(address),
        avatar:          "🧑‍🌾",
        exp:             0,
        total_harvested: 0,
        total_earned:    0,
      })
      .select()
      .maybeSingle();

    if (insertErr) console.error("createProfile error:", insertErr);
    if (created) setProfile(created);
    return created;
  }, []);

  // Save username + avatar
  const saveProfile = useCallback(async (address, username, avatar) => {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({ username, avatar })
      .eq("wallet", address.toLowerCase())
      .select()
      .maybeSingle();
    if (error) console.error("saveProfile error:", error);
    if (data) setProfile(data);
    setSaving(false);
    return data;
  }, []);

  // Persist EXP + stats after harvest
  const persistHarvest = useCallback(async (address, newExp, newHarvested, newEarned) => {
    const { data, error } = await supabase
      .from("profiles")
      .update({ exp: newExp, total_harvested: newHarvested, total_earned: newEarned })
      .eq("wallet", address.toLowerCase())
      .select()
      .maybeSingle();
    if (error) console.error("persistHarvest error:", error);
    if (data) setProfile(data);
  }, []);

  // Update profile locally (optimistic)
  const updateProfileLocal = useCallback((updates) => {
    setProfile(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  // Load leaderboard
  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("wallet, username, avatar, exp, total_harvested, total_earned")
      .order("exp", { ascending: false })
      .limit(20);
    if (error) console.error("leaderboard error:", error);
    setLeaderboard(data || []);
    setLbLoading(false);
  }, []);

  const clearProfile = useCallback(() => setProfile(null), []);

  return {
    profile, leaderboard, lbLoading, savingProfile,
    loadProfile, saveProfile, persistHarvest,
    updateProfileLocal, loadLeaderboard, clearProfile,
  };
}