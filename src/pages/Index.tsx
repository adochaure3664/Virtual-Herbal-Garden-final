import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useUserRole } from "@/hooks/useUserRole";

import HeroSection from "@/components/HeroSection";
import FloatingBot from "@/components/FloatingBot";

interface Herb {
  id: string;
  name: string;
  scientific_name: string | null;
  description: string;
  category: string;
  image_url: string | null;
  benefits: string[];
}

const Index = () => {
  const [herbs, setHerbs] = useState<Herb[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [translatedHerbs, setTranslatedHerbs] = useState<Record<string, Herb>>({});

  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { isAdmin } = useUserRole();

  useEffect(() => {
    fetchHerbs();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (i18n.language !== "en" && herbs.length > 0) {
      translateHerbs();
    }
  }, [i18n.language, herbs]);

  const fetchHerbs = async () => {
    try {
      const { data, error } = await supabase.from("herbs").select("*");
      if (error) throw error;
      setHerbs(data || []);
    } catch {
      toast({
        title: "Error fetching herbs",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const translateHerbs = async () => {
    const translated: Record<string, Herb> = {};

    for (const herb of herbs) {
      try {
        const response = await supabase.functions.invoke("translate-plant", {
          body: { herb, targetLanguage: i18n.language },
        });

        if (response.data) {
          translated[herb.id] = response.data;
        }
      } catch {
        console.error("Translation failed for:", herb.name);
      }
    }

    setTranslatedHerbs(translated);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
  };

  return (
    <>
      <HeroSection
        user={user}
        isAdmin={isAdmin}
        navigate={navigate}
        handleSignOut={handleSignOut}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      {/* 🤖 Floating Chat Bot */}
      <FloatingBot />
    </>
  );
};

export default Index;
