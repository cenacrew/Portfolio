import { LinkIcon, GithubIcon, EyeIcon } from "./icons";

/* eslint-disable @next/next/no-img-element */

// Section Projets : deux rangées de cartes. Chaque carte garde ses classes
// (card1..card6) et ids d'illustration d'origine pour un rendu identique.
export default function Projects() {
  return (
    <div id="projets">
      <p id="projetsTitle" className="title text l">
        Projets
      </p>

      <div className="firstRow">
        <div className="card1 card">
          <p className="cardTitle">Mini-RSA</p>
          <img src="/files/img/miniRSA.png" className="illuprojets" id="illuRSA" alt="Mini-RSA" />
          <p className="cardDesc">
            Pouvoir crypter et décrypter des message à base de génération de clé
            et en implémenter son interface
          </p>
          <div className="tag">
            <p>html</p>
            <p>pyscript</p>
            <p>python</p>
          </div>
          <div className="link">
            <a href="https://mini-rsa.vercel.app" target="_blank">
              <LinkIcon width="36px" />
            </a>
            <a href="https://github.com/cenacrew/miniRSA" target="_blank">
              <GithubIcon width="40px" />
            </a>
          </div>
        </div>

        <div className="card2 card">
          <p className="cardTitle">Affiche JPO</p>
          <img src="/files/img/JPO.png" className="wip" id="illuJPO" alt="Affiche JPO" />
          <p className="cardDesc">
            Réaliser les différentes affiches et badges pour la journée portes
            ouvertes 2022 de l&apos;IUT informatique tout en respectant un cahier
            des charges précis
          </p>
          <div className="tag">
            <p>photoshop</p>
          </div>
          <a href="/files/pdf/presJPO.pdf" target="_blank">
            <EyeIcon width="45px" />
          </a>
        </div>

        <div className="card3 card">
          <p className="cardTitle">Pong</p>
          <img src="/files/img/pong.png" className="wip" id="illuPong" alt="Pong" />
          <p className="cardDesc">
            Réaliser un jeu reprenant le principe de &quot;pong&quot; en pouvant
            controler 2 raquettes, un mode avec 4 balles et le rajout
            d&apos;obstacles
          </p>
          <div className="tag">
            <p>processing</p>
          </div>
          <div className="link">
            <a href="/WIP" target="_blank">
              <LinkIcon width="36px" />
            </a>
            <a href="https://github.com/cenacrew/pong" target="_blank">
              <GithubIcon width="40px" />
            </a>
          </div>
        </div>
      </div>

      <div className="secondRow">
        <div className="card4 card">
          <p className="cardTitle">BloomFilter</p>
          <img src="/files/img/Bloom.png" className="wip" id="illuBloom" alt="BloomFilter" />
          <p className="cardDesc">
            Réaliser un Filtre de Bloom fonctionnant de trois facon différentes
            puis un benchmark de ce filtre et en réaliser un papier d&apos;analyse
          </p>
          <div className="tag">
            <p>java</p>
          </div>
          <div className="link">
            <a href="/files/pdf/RapportBloomFilter.pdf" target="_blank">
              <EyeIcon width="45px" />
            </a>
            <a href="https://github.com/cenacrew/BloomFilter" target="_blank">
              <GithubIcon width="40px" />
            </a>
          </div>
        </div>

        <div className="card5 card">
          <p className="cardTitle">Démineur</p>
          <img src="/files/img/demineur.png" className="wip" id="illuDemineur" alt="Démineur" />
          <p className="cardDesc">
            Corriger, optimiser et améliorer un démineur en java, via
            l&apos;utilisation de branche et de merge
          </p>
          <div className="tag">
            <p>java</p>
          </div>
          <div className="link">
            <a href="https://github.com/cenacrew/DemineurProject" target="_blank">
              <GithubIcon width="40px" />
            </a>
          </div>
        </div>

        <div className="card6 card">
          <p className="cardTitle">WatchList</p>
          <img src="/files/img/watchlist.png" className="wip" id="illuWatchlist" alt="WatchList" />
          <p className="cardDesc">
            En partant de rien, réaliser un site permetant de voir une liste de
            series, les liker, suivre notre progression et plein d&apos;autre
            fontionalité donné petit a petit
          </p>
          <div className="tag">
            <p>PHP</p>
            <p>HTML</p>
            <p>CSS</p>
            <p>Symfony</p>
          </div>
          <div className="link">
            <a
              href="https://gitlab-ce.iut.u-bordeaux.fr/lecopeaux/e7-dev-app"
              target="_blank"
            >
              <GithubIcon width="40px" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
