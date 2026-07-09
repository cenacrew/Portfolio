export default function QuiSuisJe() {
  return (
    <div id="QSJ">
      <p id="QSJTitle" className="title text l">
        Qui suis-je ?
      </p>
      <div className="QSJContent">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="creation" alt="illustration creation" src="/files/img/creation.png" />
        <p id="firstP" className="text m para">
          Je suis passionné et créatif, intéressé par l&apos;art numérique et la
          création de logo, DA, UI design, et maîtrisant des logiciels tels que
          Photoshop, Lightroom et Figma. Ces intérêts et logiciels m&apos;aident
          dans mes créations informatiques, ma principale passion.
        </p>
        <br />
        <p id="secondP" className="text m para">
          Je suis actuellement en troisième années d&apos;une formation en
          informatique de 3 ans à l&apos;IUT de Bordeaux. Je suis actuellement en
          alterance chez SQLI pour acquérir une expérience professionnelle.
          J&apos;ai obtenu mon bac STI2D avec mention très bien au Lycée Albert
          Claveille à Périgueux.
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="formation" alt="illustration formation" src="/files/img/formation.png" />
      </div>
    </div>
  );
}
