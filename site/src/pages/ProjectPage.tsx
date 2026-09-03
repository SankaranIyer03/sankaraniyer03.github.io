import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  projects,
  projectBySlug,
  type Doc,
  type MediaItem,
  type ModelItem,
} from "../content/projects";
import { actById } from "../content/acts";
import { Figure } from "../components/primitives/Figure";
import { Video } from "../components/primitives/Video";
import { DeckViewer } from "../components/primitives/DeckViewer";
import { CountUp } from "../components/primitives/CountUp";
import { ModelViewer } from "../components/primitives/ModelViewer";
import { InteractiveSlot } from "../components/interactive/InteractiveSlot";
import { ActSpans } from "../components/work/ActSpans";
import { Footer } from "../components/Footer";
import { riseIn, staggerParent, viewportOnce } from "../lib/motion";

/** One media item, rendered as the right kind of element for its type. */
function Media({
  item,
  priority = false,
  fill = false,
  caption = true,
}: {
  item: MediaItem;
  priority?: boolean;
  /** Fill a split column instead of using the source aspect. */
  fill?: boolean;
  caption?: boolean;
}) {
  if (item.kind === "video") {
    return (
      <Video
        media={item.key}
        mode={item.loop ? "loop" : "player"}
        label={item.caption}
        caption={caption ? item.caption : undefined}
        priority={priority}
        fill={fill}
      />
    );
  }
  return (
    <figure
      className={`reg-marks relative border border-line bg-card ${
        fill ? "flex h-full flex-col" : ""
      }`}
    >
      <Figure
        media={item.key}
        alt={item.caption}
        size="large"
        priority={priority}
        fill={fill}
        className={fill ? "min-h-0 flex-1" : undefined}
        sizes={item.wide ? "100vw" : "(max-width: 768px) 100vw, 50vw"}
      />
      {caption && (
        <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
          {item.caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Text and a figure on one row, spanning the content width. */
function TextMediaSplit({
  children,
  media,
  side = "right",
  priority = false,
}: {
  children: ReactNode;
  media: MediaItem;
  side?: "left" | "right";
  priority?: boolean;
}) {
  const imageFirst = side === "left";
  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
      <div
        className={
          imageFirst
            ? "lg:col-span-5 lg:col-start-8 lg:row-start-1"
            : "lg:col-span-5"
        }
      >
        {children}
      </div>
      <div
        className={
          imageFirst
            ? "lg:col-span-7 lg:col-start-1 lg:row-start-1"
            : "lg:col-span-7"
        }
      >
        <Media item={media} priority={priority} />
      </div>
    </div>
  );
}

function Model({ item }: { item: ModelItem }) {
  return (
    <ModelViewer
      src={item.src}
      label={item.label}
      caption={item.caption}
      explode={item.explode}
    />
  );
}

function PosterCard({ doc }: { doc: Doc }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group reg-marks relative block w-full cursor-zoom-in border border-line bg-card text-left transition-colors hover:border-ink"
      >
        <img
          src={doc.preview}
          alt={doc.label}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="aspect-[3/2] w-full object-contain bg-paper-deep"
        />
        <span className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
          <span className="block text-[13.5px] font-medium">{doc.label}</span>
          <span className="label shrink-0 transition-colors group-hover:text-signal">
            View
          </span>
        </span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={doc.label}
          className="fixed inset-0 z-[80] overflow-auto bg-ink/75 p-3 md:p-8 lg:p-12"
          onClick={() => setOpen(false)}
        >
          <img
            src={doc.preview}
            alt={doc.label}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto block w-full max-w-5xl"
          />
        </div>
      )}
    </>
  );
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? projectBySlug(slug) : undefined;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    if (!project) return;
    document.title = `${project.title}, Sankaran Iyer`;
    return () => {
      document.title =
        "Sankaran Iyer, Manufacturing Systems & Operations Engineer";
    };
  }, [project]);

  if (!project) return <Navigate to="/" replace />;

  const index = projects.findIndex((p) => p.id === project.id);
  const next = projects[(index + 1) % projects.length];
  const problemFirst = Boolean(project.problemMedia);
  const embeddedDecks = (project.docs ?? []).filter(
    (doc) => doc.slides && doc.slides.length > 0,
  );
  const posterDocs = (project.docs ?? []).filter((doc) => doc.preview);
  /* A project can nominate a wide item as its opener; otherwise the card image
     leads. Problem-first pages skip the hero so the inspection photo comes first. */
  const hero = problemFirst
    ? null
    : (project.media?.find((m) => m.wide) ??
      (project.id === "freight" ||
      project.id === "john-deere" ||
      project.id === "parkvue"
        ? null
        : project.cardMedia));
  /* Anything already shown as the hero, problem figure, or inside a chapter
     is not repeated. Problem-first pages also consume the build gallery. */
  const spokenFor = new Set<string>([
    ...(hero ? [hero.key] : []),
    ...(project.problemMedia ? [project.problemMedia.key] : []),
    ...(project.chapters ?? []).flatMap((c) => (c.media ? [c.media.key] : [])),
    ...(problemFirst ? (project.media ?? []).map((item) => item.key) : []),
  ]);
  const gallery = (project.media ?? []).filter((m) => !spokenFor.has(m.key));

  const chapterModels = new Set(
    (project.chapters ?? []).flatMap((c) => (c.model ? [c.model.src] : [])),
  );
  const models = (project.models ?? []).filter(
    (m) => !chapterModels.has(m.src),
  );

  return (
    <>
      <article className="pt-24">
        {/* ---------------- Masthead ---------------- */}
        <header className="border-b border-line">
          <div className="mx-auto max-w-[1600px] px-6 py-12 md:px-10 md:py-16">
            <Link
              to="/projects"
              className="label inline-flex items-center gap-2 transition-colors hover:text-signal"
            >
              <span aria-hidden="true">←</span> All projects
            </Link>

            <motion.div
              variants={staggerParent}
              initial="hidden"
              animate="show"
              className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12"
            >
              <div className="lg:col-span-7">
                <motion.div
                  variants={riseIn}
                  className="flex flex-wrap items-center gap-x-5 gap-y-2"
                >
                  <span className="label label-signal">
                    {actById[project.act].verb}
                  </span>
                  <ActSpans spans={project.spans} />
                </motion.div>

                <motion.h1
                  variants={riseIn}
                  className="mt-6 text-[clamp(2.1rem,5vw,4rem)] leading-[1.02] font-medium tracking-[-0.035em]"
                >
                  {project.title}
                </motion.h1>

                <motion.p
                  variants={riseIn}
                  className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted"
                >
                  {project.subtitle}
                </motion.p>

                <motion.p
                  variants={riseIn}
                  className="mt-8 max-w-2xl border-l border-signal pl-5 text-[17px] leading-relaxed text-ink-soft md:text-[18px]"
                >
                  {project.oneLiner}
                </motion.p>
              </div>

              <motion.dl
                variants={riseIn}
                className="lg:col-span-4 lg:col-start-9"
              >
                <div className="border-t border-line py-3">
                  <dt className="label">Organization</dt>
                  <dd className="mt-1 text-[15px]">{project.org}</dd>
                </div>
                <div className="border-t border-line py-3">
                  <dt className="label">Role</dt>
                  <dd className="mt-1 text-[15px]">{project.role}</dd>
                </div>
                <div className="border-t border-line py-3">
                  <dt className="label">Period</dt>
                  <dd className="mt-1 text-[15px] tnum">{project.period}</dd>
                </div>
                {project.team && (
                  <div className="border-t border-line py-3">
                    <dt className="label">Team</dt>
                    <dd className="mt-1 text-[15px]">{project.team}</dd>
                  </div>
                )}
                <div className="border-t border-b border-line py-3">
                  <dt className="label">Tools</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {project.stack.map((tool) => (
                      <span
                        key={tool}
                        className="border border-line px-2 py-0.5 font-mono text-[10.5px] tracking-[0.08em] text-ink-muted uppercase"
                      >
                        {tool}
                      </span>
                    ))}
                  </dd>
                </div>
              </motion.dl>
            </motion.div>
          </div>
        </header>

        {/* ---------------- Metrics ---------------- */}
        {project.headlineMetrics.length > 0 && (
          <section
            aria-label="Key figures"
            className="border-b border-line bg-card"
          >
            <dl className="mx-auto flex max-w-[1600px] flex-wrap gap-x-16 gap-y-8 px-6 py-9 md:px-10">
              {project.headlineMetrics.map((metric) => (
                <div key={metric.label}>
                  <dt className="text-[clamp(1.7rem,3vw,2.5rem)] leading-none font-medium tracking-[-0.03em] tnum">
                    <CountUp value={metric.value} />
                    {metric.unit && (
                      <span className="ml-1.5 font-mono text-[0.44em] tracking-wide text-ink-muted">
                        {metric.unit}
                      </span>
                    )}
                  </dt>
                  <dd className="mt-2.5 text-[13px] text-ink-muted">
                    {metric.label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ---------------- Hero media ---------------- */}
        {hero && (
          <section className="border-b border-line bg-paper-deep py-12 md:py-16">
            {project.id === "rc-car-spc" ? (
              <div className="mx-auto max-w-[1600px] px-6 md:px-10">
                <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                  <figure className="reg-marks relative border border-line bg-card">
                    <figcaption className="border-b border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
                      The manufactured drivetrain, the bore this study is about.
                    </figcaption>
                    <Figure
                      media="rc-car/drivetrain"
                      alt="The manufactured drivetrain, the bore this study is about."
                      size="large"
                      priority
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                  </figure>
                  <div>
                    <ModelViewer
                      src="/models/rc-car-assembly.glb"
                      label="Full vehicle assembly"
                      caption="The assembly this holder belongs to, fully exploded."
                      explode={100}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`mx-auto px-6 md:px-10 ${
                  project.id === "rc-car"
                    ? "max-w-3xl"
                    : project.id === "terraprobe" ||
                        project.id === "ge-vernova" ||
                        project.id === "rc-car-line" ||
                        project.id === "roll-to-roll" ||
                        project.id === "freight" ||
                        project.id === "john-deere"
                      ? "max-w-5xl"
                      : "max-w-[1600px]"
                }`}
              >
                <Media item={hero} priority />
              </div>
            )}
          </section>
        )}

        {/* ---------------- Problem ---------------- */}
        <section className="border-b border-line py-16 md:py-24">
          <motion.div
            className="mx-auto max-w-[1600px] px-6 md:px-10"
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {project.problemMedia ? (
              <motion.div variants={riseIn}>
                <TextMediaSplit media={project.problemMedia} priority>
                  <div className="flex items-center gap-4">
                    <span className="label tnum">01</span>
                    <span className="h-px w-12 bg-line-strong" />
                    <span className="label label-signal">The problem</span>
                  </div>
                  <p className="mt-6 text-[16.5px] leading-relaxed text-ink-soft">
                    {project.problem}
                  </p>
                </TextMediaSplit>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
                <motion.div variants={riseIn} className="lg:col-span-5">
                  <div className="flex items-center gap-4">
                    <span className="label tnum">01</span>
                    <span className="h-px w-12 bg-line-strong" />
                    <span className="label label-signal">The problem</span>
                  </div>
                  {project.continues && (
                    <p className="mt-6 text-[16.5px] leading-relaxed text-ink-soft">
                      This is an extension of{" "}
                      <Link
                        to={`/work/${project.continues.slug}`}
                        className="border-b border-line-strong transition-colors hover:border-signal hover:text-signal"
                      >
                        {project.continues.title}
                      </Link>
                      .
                    </p>
                  )}
                  {project.problem.split("\n\n").map((para) => (
                    <p
                      key={para.slice(0, 40)}
                      className="mt-6 text-[16.5px] leading-relaxed text-ink-soft"
                    >
                      {para}
                    </p>
                  ))}
                </motion.div>
                <motion.div
                  variants={riseIn}
                  className="lg:col-span-6 lg:col-start-7"
                >
                  <div className="flex items-center gap-4">
                    <span className="label tnum">02</span>
                    <span className="h-px w-12 bg-line-strong" />
                    <span className="label label-signal">
                      {project.id === "rc-car-spc" ||
                    project.id === "freight" ||
                    project.id === "roll-to-roll" ||
                    project.id === "parkvue"
                      ? "What we did"
                      : "What I did"}
                    </span>
                  </div>
                  <ul className="mt-6">
                    {project.did.map((item, i) => (
                      <li
                        key={item}
                        className="flex gap-5 border-b border-line py-4 first:border-t"
                      >
                        <span className="label tnum shrink-0 pt-1">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <p className="text-[15.5px] leading-relaxed text-ink-soft">
                          {item}
                        </p>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            )}
          </motion.div>
        </section>

        {/* ---------------- What we built ---------------- */}
        {problemFirst && (
          <section className="border-b border-line py-16 md:py-24">
            <motion.div
              className="mx-auto max-w-[1600px] px-6 md:px-10"
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <motion.div variants={riseIn}>
                {project.media?.[0] ? (
                  <TextMediaSplit media={project.media[0]} side="right" priority>
                    <div className="flex items-center gap-4">
                      <span className="label tnum">02</span>
                      <span className="h-px w-12 bg-line-strong" />
                      <span className="label label-signal">What we built</span>
                    </div>
                    {project.build && (
                      <p className="mt-6 text-[16.5px] leading-relaxed text-ink-soft">
                        {project.build}
                      </p>
                    )}
                    <ul className="mt-8">
                      {project.did.map((item, i) => (
                        <li
                          key={item}
                          className="flex gap-5 border-b border-line py-4 first:border-t"
                        >
                          <span className="label tnum shrink-0 pt-1">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <p className="text-[15.5px] leading-relaxed text-ink-soft">
                            {item}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </TextMediaSplit>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <span className="label tnum">02</span>
                      <span className="h-px w-12 bg-line-strong" />
                      <span className="label label-signal">What we built</span>
                    </div>
                    {project.build && (
                      <p className="mt-6 max-w-3xl text-[16.5px] leading-relaxed text-ink-soft">
                        {project.build}
                      </p>
                    )}
                  </>
                )}
              </motion.div>

              {(project.media ?? []).slice(1).length > 0 && (
                <motion.div
                  variants={staggerParent}
                  className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2"
                >
                  {(project.media ?? []).slice(1).map((item) => (
                    <motion.div
                      key={item.key}
                      variants={riseIn}
                      className="aspect-[16/10]"
                    >
                      <Media item={item} fill />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </section>
        )}

        {/* ---------------- Outcome ---------------- */}
        {project.outcome.length > 0 && (
          <section className="border-b border-line bg-card py-16 md:py-20">
            <motion.div
              className="mx-auto max-w-[1600px] px-6 md:px-10"
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <motion.div variants={riseIn} className="flex items-center gap-4">
                <span className="label tnum">03</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">Outcome</span>
              </motion.div>

              <motion.ul
                variants={staggerParent}
                className="mt-8 grid grid-cols-1 gap-x-14 md:grid-cols-2"
              >
                {project.outcome.map((item) => (
                  <motion.li
                    key={item}
                    variants={riseIn}
                    className="flex gap-4 border-t border-line py-5"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-signal"
                    />
                    <p className="text-[15.5px] leading-relaxed text-ink-soft">
                      {item}
                    </p>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          </section>
        )}

        {project.note && (
          <section className="border-b border-line py-16 md:py-20">
            <motion.div
              className="mx-auto max-w-[1600px] px-6 md:px-10"
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              <motion.div variants={riseIn} className="flex items-center gap-4">
                <span className="label tnum">03</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">Under review</span>
              </motion.div>
              <motion.p
                variants={riseIn}
                className="mt-6 max-w-2xl text-[16.5px] leading-relaxed text-ink-soft"
              >
                {project.note}
              </motion.p>
            </motion.div>
          </section>
        )}

        {/* ---------------- Sponsor deck ---------------- */}
        {problemFirst && embeddedDecks.length > 0 && (
          <section className="border-b border-line py-16 md:py-24">
            <div className="mx-auto max-w-[1600px] px-6 md:px-10">
              <div className="flex items-center gap-4">
                <span className="label tnum">04</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">Sponsor slides</span>
              </div>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
                Step through the overview.
              </p>
              <div className="mt-8 flex flex-col gap-10">
                {embeddedDecks.map((doc) => (
                  <DeckViewer
                    key={doc.label}
                    label={doc.label}
                    slides={doc.slides ?? []}
                    kind={doc.kind}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Chapters ---------------- */}
        {project.chapters && project.chapters.length > 0 && (
          <section className="border-b border-line py-16 md:py-24">
            <div className="mx-auto max-w-[1600px] px-6 md:px-10">
              <div className="flex items-center gap-4">
                <span className="label tnum">04</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">
                  How it went, stage by stage
                </span>
              </div>

              <div className="mt-12 flex flex-col gap-16 md:gap-24">
                {project.chapters.map((chapter) => (
                  <motion.div
                    key={chapter.code}
                    variants={staggerParent}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportOnce}
                    className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-14"
                  >
                    <motion.div
                      variants={riseIn}
                      className={
                        chapter.model || chapter.media || chapter.interactive
                          ? "lg:col-span-4"
                          : "lg:col-span-7"
                      }
                    >
                      <div className="lg:sticky lg:top-28">
                        <div className="flex items-baseline gap-4">
                          <span className="font-mono text-[2.4rem] leading-none font-medium text-ink-faint tnum">
                            {chapter.code}
                          </span>
                          <span className="label label-signal">
                            {actById[chapter.act].verb}
                          </span>
                        </div>
                        <h3 className="mt-5 text-[1.5rem] leading-[1.15] font-medium tracking-[-0.02em]">
                          {chapter.title}
                        </h3>
                        <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                          {chapter.body}
                        </p>
                      </div>
                    </motion.div>

                    {(chapter.model ||
                      chapter.media ||
                      chapter.interactive) && (
                      <motion.div variants={riseIn} className="lg:col-span-8">
                        {chapter.model && <Model item={chapter.model} />}
                        {chapter.media && <Media item={chapter.media} />}
                        {chapter.interactive && (
                          <InteractiveSlot id={chapter.interactive} />
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Standalone interactive ---------------- */}
        {project.interactive && !project.chapters && (
          <section className="border-b border-line py-16 md:py-20">
            <div className="mx-auto max-w-[1600px] px-6 md:px-10">
              <div className="flex items-center gap-4">
                <span className="label tnum">04</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">Try it</span>
              </div>
              <div className="mt-8">
                <InteractiveSlot id={project.interactive} />
              </div>
            </div>
          </section>
        )}

        {/* ---------------- CAD ---------------- */}
        {models.length > 0 && (
          <section className="border-b border-line bg-paper-deep py-16 md:py-20">
            <div className="mx-auto max-w-[1600px] px-6 md:px-10">
              <div className="flex items-center gap-4">
                <span className="label tnum">05</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">The hardware</span>
              </div>
              <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {models.flatMap((model) => [
                  <Model key={model.src} item={model} />,
                  <Model
                    key={`${model.src}-exploded`}
                    item={{
                      ...model,
                      label: `${model.label}, exploded`,
                      caption: 'Same assembly, fully exploded.',
                      explode: 100,
                    }}
                  />,
                ])}
              </div>
            </div>
          </section>
        )}

        {/* ---------------- Gallery ---------------- */}
        {(gallery.length > 0 ||
          (!problemFirst && embeddedDecks.length > 0) ||
          posterDocs.length > 0) && (
          <section className="border-b border-line bg-paper-deep py-16 md:py-20">
            <div className="mx-auto max-w-[1600px] px-6 md:px-10">
              <div className="flex items-center gap-4">
                <span className="label tnum">06</span>
                <span className="h-px w-12 bg-line-strong" />
                <span className="label label-signal">
                  {project.id === "john-deere" ? "Posters" : "From the build"}
                </span>
              </div>
              {project.id === "john-deere" && (
                <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
                  Symposium posters from 2024 and 2025. Twelve Purdue
                  graduate and undergraduate students built the models. I
                  led the partnership. Click a poster to view it.
                </p>
              )}

              {gallery.length > 0 && (
                <motion.div
                  className={`mt-8 grid grid-cols-1 gap-6 ${
                    project.id === "terraprobe"
                      ? "mx-auto max-w-3xl"
                      : "md:grid-cols-2"
                  }`}
                  variants={staggerParent}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                >
                  {gallery.map((item) => (
                    <motion.div
                      key={item.key}
                      variants={riseIn}
                      className={
                        project.id !== "terraprobe" && gallery.length === 1
                          ? "md:col-span-2"
                          : undefined
                      }
                    >
                      <Media item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {posterDocs.length > 0 && (
                <div className="mx-auto mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
                  {posterDocs.map((doc) => (
                    <PosterCard key={doc.label} doc={doc} />
                  ))}
                </div>
              )}

              {!problemFirst && embeddedDecks.length > 0 && (
                <div
                  className={
                    project.id === "terraprobe" ||
                    project.id === "rc-car" ||
                    project.id === "freight"
                      ? "mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2"
                      : project.id === "parkvue"
                        ? "mx-auto mt-8 max-w-4xl"
                      : project.id === "rc-car-spc" ||
                          project.id === "rc-car-line" ||
                          project.id === "roll-to-roll"
                        ? `mx-auto max-w-3xl ${gallery.length > 0 ? "mt-12" : "mt-8"}`
                        : `flex flex-col gap-10 ${gallery.length > 0 ? "mt-12" : "mt-8"}`
                  }
                >
                  {embeddedDecks.map((doc) => (
                    <DeckViewer
                      key={doc.label}
                      label={doc.label}
                      slides={doc.slides ?? []}
                      kind={doc.kind}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------- Next ---------------- */}
        <nav className="py-16 md:py-20">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <Link
              to={`/work/${next.slug}`}
              className="group block border-t border-line pt-8"
            >
              <span className="label">Next project</span>
              <span className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
                <span className="text-[clamp(1.5rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.03em] transition-colors group-hover:text-signal">
                  {next.title}
                </span>
                <span
                  aria-hidden="true"
                  className="text-2xl transition-transform duration-300 group-hover:translate-x-2"
                >
                  →
                </span>
              </span>
              <span className="mt-2 block text-[15px] text-ink-muted">
                {next.subtitle}
              </span>
            </Link>
          </div>
        </nav>
      </article>
      <Footer />
    </>
  );
}
