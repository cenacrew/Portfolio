import { GithubIcon, LinkedinIcon, DownloadIcon } from "./icons";

// Bloc central de l'accueil : profil, photo et bouton CV.
export default function Profil() {
  return (
    <div className="center">
      {/* Profil */}
      <section id="profil">
        <p id="bvn" className="m">
          Bienvenue ! 👋
        </p>
        <h1 className="text xl">Sourdois Pajot Valentin</h1>
        <p className="text m">Développeur Full-Stack</p>
        <a href="https://github.com/cenacrew" target="_blank">
          <GithubIcon width="45px" />
        </a>
        <a
          href="https://www.linkedin.com/in/valentin-sourdois-pajot/"
          target="_blank"
        >
          <LinkedinIcon width="50px" />
        </a>
      </section>

      {/* Cercle central */}
      <div className="carousel">
        <div className="mid">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id="photo" alt="ma photo" src="/files/img/pp.png" />
        </div>
        <div className="skill-icons"></div>
      </div>

      {/* CV */}
      <div className="cv">
        <p className="text m">Télécharger mon CV</p>
        <a href="/files/pdf/CV.pdf" target="_blank">
          <DownloadIcon />
        </a>
      </div>
    </div>
  );
}
