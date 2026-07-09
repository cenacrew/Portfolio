import { MailIcon, LinkedinIcon, PhoneIcon } from "./icons";

export default function Contact() {
  return (
    <div id="contact">
      <p id="contactTitle" className="title text l">
        Contact
      </p>
      <div className="contactInfo">
        <div className="mail">
          <div className="mail1">
            <a href="mailto:valetnina.sp@gmail.com">
              <MailIcon />
            </a>
          </div>
          <p className="text m mail2">contact@cenacrew.com</p>
        </div>

        <div className="linkedincontact">
          <div className="l1">
            <a
              href="https://www.linkedin.com/in/valentin-sourdois-pajot/"
              target="_blank"
            >
              <LinkedinIcon width="75px" />
            </a>
          </div>
        </div>

        <div className="phone">
          <div className="tel1">
            <a href="tel:+33783381438">
              <PhoneIcon />
            </a>
          </div>
          <p className="text m tel2">0783381438</p>
        </div>
      </div>
    </div>
  );
}
