// Reprise de l'ancienne 404.html. React hoiste automatiquement les <link>
// dans le <head>. Bootstrap et la police Arvo sont conservés pour un rendu
// identique ; les styles .page_404 vivent dans globals.css.
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css"
      />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Arvo" />

      <section className="page_404">
        <div className="container">
          <div className="row">
            <div className="col-sm-12 ">
              <div className="col-sm-10 col-sm-offset-1  text-center">
                <div className="four_zero_four_bg">
                  <h1 className="text-center ">404</h1>
                </div>

                <div className="contant_box_404">
                  <h3 className="h2">Look like you&apos;re lost</h3>

                  <p>the page you are looking for not avaible!</p>

                  <Link href="/" className="link_404">
                    Go to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
