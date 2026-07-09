import Nav from "@/components/Nav";
import Settings from "@/components/Settings";
import Profil from "@/components/Profil";
import QuiSuisJe from "@/components/QuiSuisJe";
import Projects from "@/components/Projects";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="content">
      {/* Accueil */}
      <div id="accueil">
        <Nav />
        <Settings />
        <Profil />
      </div>

      <div className="separator"></div>

      <QuiSuisJe />

      <div className="separator"></div>

      <Projects />

      <div className="separator"></div>

      <Contact />

      <Footer />
    </div>
  );
}
