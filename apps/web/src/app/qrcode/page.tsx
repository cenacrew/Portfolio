import type { Metadata } from "next";
import { redirect } from "next/navigation";

// Contenu provisoire (phase 1) : reprend le comportement de l'ancienne
// pages/qrcode.html — une redirection vers le Bento actuel. La phase 2
// remplacera cette route par le vrai dashboard bento.
// L'URL publique cenacrew.com/qrcode doit rester fonctionnelle en permanence.

export const metadata: Metadata = {
  title: "Redirection",
};

export default function QrCodePage() {
  redirect("https://bento.me/qrcode");
}
