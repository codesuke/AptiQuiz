import { ArrowRight, BookOpen, MoveUpRight, UsersRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getHomeDestinations } from "./home-destinations";
import styles from "./home-screen.module.css";

export function HomeScreen({ signedIn }: Readonly<{ signedIn: boolean }>) {
  const paths = getHomeDestinations(signedIn);
  return (
    <>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroImage} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowRule} /> Better practice. Brighter people.
            </p>
            <h1 id="home-title">
              Practice with purpose<span className={styles.orange}>.</span> Play for progress
              <span className={styles.orange}>.</span>
            </h1>
            <p className={styles.heroLead}>
              Build a Question Set, host a live Room, or join your peers for a better kind of
              aptitude practice.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryButton} href={paths.hosting}>
                Host a Room <ArrowRight aria-hidden="true" size={20} />
              </Link>
              <Link className={styles.textLink} href={paths.joining}>
                Join a Room <MoveUpRight aria-hidden="true" size={17} />
              </Link>
            </div>
          </div>
          <p className={styles.heroNote}>
            Sharper minds.
            <br />A brighter tomorrow.
          </p>
        </div>
      </section>

      <section className={styles.ways} aria-labelledby="ways-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>AptiQuiz / Study together, go further</p>
          <h2 id="ways-title" className={styles.sectionTitle}>
            One place to prepare together<span className={styles.orange}>.</span>
          </h2>
          <p className={styles.sectionIntro}>
            Create, host, or join. Choose the way that moves your practice forward.
          </p>
          <div className={styles.waysGrid}>
            <article className={styles.way}>
              <span className={styles.wayNumber}>01</span>
              <BookOpen aria-hidden="true" className={styles.wayIcon} strokeWidth={1.2} />
              <h3>Build a Question Set</h3>
              <p>Turn your questions into focused practice for your next Room.</p>
              <Link href={paths.questionSets}>
                {signedIn ? "Create a set" : "Sign in to create"}{" "}
                <ArrowRight aria-hidden="true" size={19} />
              </Link>
            </article>
            <article className={`${styles.way} ${styles.wayFeatured}`}>
              <span className={styles.wayNumber}>02</span>
              <UsersRound aria-hidden="true" className={styles.wayIcon} strokeWidth={1.2} />
              <h3>Host a Room</h3>
              <p>Bring people together in a Room for focused practice.</p>
              <Link href={paths.hosting}>
                Host a Room <ArrowRight aria-hidden="true" size={19} />
              </Link>
            </article>
            <article className={styles.way}>
              <span className={styles.wayNumber}>03</span>
              <MoveUpRight aria-hidden="true" className={styles.wayIcon} strokeWidth={1.2} />
              <h3>Join a Room</h3>
              <p>Enter a Join Code and practice alongside your peers.</p>
              <Link href={paths.joining}>
                Join a Room <ArrowRight aria-hidden="true" size={19} />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.questionFeature} aria-labelledby="question-title">
        <div className={styles.questionVisual}>
          <Image
            src="/images/home/question-cards.webp"
            alt="Question cards and a pencil arranged on a green desk"
            fill
            loading="eager"
            sizes="(max-width: 800px) 100vw, 52vw"
          />
        </div>
        <div className={styles.questionCopy}>
          <p className={styles.eyebrow}>The starting point</p>
          <h2 id="question-title">
            A better question starts everything<span className={styles.orange}>.</span>
          </h2>
          <p>
            Create your own Question Set or start with the shared set. Make every Room worth showing
            up for.
          </p>
          <Link className={styles.featureLink} href={paths.questionSets}>
            Explore Question Sets <ArrowRight aria-hidden="true" size={20} />
          </Link>
        </div>
      </section>

      <section className={styles.process} id="how-it-works" aria-labelledby="process-title">
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>How it works</p>
          <h2 id="process-title" className={styles.sectionTitle}>
            From a Question Set to a live Room<span className={styles.orange}>.</span>
          </h2>
          <p className={styles.sectionIntro}>
            A simple path from your first question to shared practice.
          </p>
          <div className={styles.steps}>
            <article>
              <span>01</span>
              <h3>Build your set</h3>
              <p>Write your Questions or choose the starter set.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Share a Join Code</h3>
              <p>Create a Room and invite your peers.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Practice together</h3>
              <p>Enter the Lobby and get ready to play.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.college} aria-labelledby="college-title">
        <div className={styles.collegeImage}>
          <Image
            src="/images/home/students-library.webp"
            alt="Students preparing together at a library table"
            fill
            loading="eager"
            sizes="(max-width: 800px) 100vw, 53vw"
          />
        </div>
        <div className={styles.collegeCopy}>
          <p className={styles.eyebrow}>Better together</p>
          <h2 id="college-title">
            Practice is better with your people<span className={styles.orange}>.</span>
          </h2>
          <p>Host a Room for your peers. Bring your Home College into every match.</p>
          <Link className={styles.collegeLink} href="/college">
            Choose your College <ArrowRight aria-hidden="true" size={20} />
          </Link>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.wrap}>
          <h2 id="closing-title">
            Ready for the <br />
            next round?
          </h2>
          <p>Your next good question can bring a whole Room together.</p>
          <div className={styles.actions}>
            <Link className={styles.lightButton} href={paths.hosting}>
              Host a Room <ArrowRight aria-hidden="true" size={20} />
            </Link>
            <Link className={styles.darkLink} href={paths.joining}>
              Join a Room <MoveUpRight aria-hidden="true" size={17} />
            </Link>
          </div>
        </div>
      </section>
      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div>
            <span className={styles.footerLogo}>
              <Image
                src="/brand/aptiquiz-logo.png"
                alt="AptiQuiz"
                width={2172}
                height={724}
                loading="eager"
                sizes="176px"
              />
            </span>
            <p>Practice today. Place tomorrow.</p>
          </div>
          <nav aria-label="Footer">
            <Link href={paths.questionSets}>Question Sets</Link>
            <Link href={paths.hosting}>Host</Link>
            <Link href={paths.joining}>Join</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}
