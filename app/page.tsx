"use client";

import { defaultContent } from "@/lib/defaultContent";
import { getPortfolio, login, regenerateApiKey, registerAdmin, requestApiKeyOtp, saveSection, uploadMedia } from "@/lib/api";
import type { Experience, GridItem, HeroContent, NavItem, PortfolioContent, Project, SocialLink, Testimonial } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type Section = "hero" | "nav" | "about" | "projects" | "experience" | "testimonials" | "social";
type AuthMode = "login" | "register" | "regenerate-key";

const sections: { id: Section; label: string }[] = [
  { id: "hero", label: "Hero" },
  { id: "nav", label: "Navigation" },
  { id: "about", label: "About" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "testimonials", label: "Testimonials" },
  { id: "social", label: "Social links" },
];

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [otp, setOtp] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [activeSection, setActiveSection] = useState<Section>("hero");
  const [content, setContent] = useState<PortfolioContent | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loggedIn = Boolean(token);
  const activeLabel = useMemo(() => sections.find((section) => section.id === activeSection)?.label, [activeSection]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("portfolio_admin_token");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    if (!token) return;

    setLoadingContent(true);
    setLoadError("");
    getPortfolio()
      .then((data) => setContent({ ...defaultContent, ...data }))
      .catch(() => setLoadError("Backend is not reachable. Start the API before editing portfolio content."))
      .finally(() => setLoadingContent(false));
  }, [token]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await login(email, password);
      setToken(response.token);
      window.localStorage.setItem("portfolio_admin_token", response.token);
      setMessage("");
    } catch {
      setMessage("Invalid admin credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await registerAdmin(email, password, apiKey);
      const response = await login(email, password);
      setToken(response.token);
      window.localStorage.setItem("portfolio_admin_token", response.token);
      setMessage("");
    } catch {
      setMessage("Registration failed. Confirm owner email, password length, and admin API key.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestOtp() {
    setBusy(true);
    setMessage("");
    setNewApiKey("");

    try {
      await requestApiKeyOtp(email);
      setMessage("If the email is the configured owner, an OTP has been sent.");
    } catch {
      setMessage("OTP request failed. Check the backend and email configuration.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerateApiKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setNewApiKey("");

    try {
      const response = await regenerateApiKey(email, otp);
      setNewApiKey(response.apiKey);
      setMessage("Admin API key regenerated. Store it securely; it will not be shown again.");
    } catch {
      setMessage("API key regeneration failed. Confirm owner email and OTP.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    setToken("");
    window.localStorage.removeItem("portfolio_admin_token");
    setMessage("Logged out.");
  }

  async function persist(section: Section) {
    if (!content) return;

    const value = sectionValue(section, content);
    setBusy(true);
    setMessage("");

    try {
      await saveSection(section, value, token);
      setMessage(`${activeLabel} saved.`);
    } catch {
      setMessage("Save failed. Check login, API, and backend logs.");
    } finally {
      setBusy(false);
    }
  }

  async function uploadProjectImage(index: number, file: File) {
    setBusy(true);
    setMessage("");

    try {
      const media = await uploadMedia(file, token);
      updateProject(index, { img: media.url });
      setMessage("Photo uploaded. Save projects to publish the new image.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Upload failed.";
      setMessage(
        detail === "Failed to fetch"
          ? "Upload API failed or CORS blocked the error response. If Network shows 500, check backend logs and R2 AWS_* configuration."
          : detail
      );
    } finally {
      setBusy(false);
    }
  }

  function updateHero(value: Partial<HeroContent>) {
    if (!content) return;
    setContent((current) => ({ ...current!, heroContent: { ...current!.heroContent, ...value } }));
  }

  function addNavItem() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      navItems: [...current!.navItems, { name: "New link", link: "#" }],
    }));
  }

  function updateNavItem(index: number, value: Partial<NavItem>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      navItems: current!.navItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function removeNavItem(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      navItems: current!.navItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateGridItem(index: number, value: Partial<GridItem>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      gridItems: current!.gridItems.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function addGridItem() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      gridItems: [
        ...current!.gridItems,
        {
          id: nextId(current!.gridItems),
          title: "New about card",
          description: "",
          className: "lg:col-span-2 md:col-span-3 md:row-span-1",
          imgClassName: "",
          titleClassName: "justify-start",
          img: "",
          spareImg: "",
        },
      ],
    }));
  }

  function removeGridItem(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      gridItems: current!.gridItems.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateProject(index: number, value: Partial<Project>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      projects: current!.projects.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function addProject() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      projects: [
        ...current!.projects,
        {
          id: nextId(current!.projects),
          title: "New Project",
          des: "Project description",
          img: "",
          iconLists: [],
          link: "",
        },
      ],
    }));
  }

  function removeProject(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      projects: current!.projects.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateExperience(index: number, value: Partial<Experience>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      workExperience: current!.workExperience.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function addExperience() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      workExperience: [
        ...current!.workExperience,
        {
          id: nextId(current!.workExperience),
          title: "New Experience",
          desc: "Experience description",
          className: "md:col-span-2",
          thumbnail: "/exp1.svg",
        },
      ],
    }));
  }

  function removeExperience(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      workExperience: current!.workExperience.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateTestimonial(index: number, value: Partial<Testimonial>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      testimonials: current!.testimonials.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function addTestimonial() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      testimonials: [...current!.testimonials, { quote: "New testimonial", name: "Name", title: "Title" }],
    }));
  }

  function removeTestimonial(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      testimonials: current!.testimonials.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function updateSocial(index: number, value: Partial<SocialLink>) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      socialMedia: current!.socialMedia.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    }));
  }

  function addSocial() {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      socialMedia: [...current!.socialMedia, { id: nextId(current!.socialMedia), img: "", link: "" }],
    }));
  }

  function removeSocial(index: number) {
    if (!content) return;
    setContent((current) => ({
      ...current!,
      socialMedia: current!.socialMedia.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function moveItem(key: "navItems" | "gridItems" | "projects" | "workExperience" | "testimonials" | "socialMedia", index: number, direction: -1 | 1) {
    if (!content) return;
    const list = content[key];
    if (!Array.isArray(list)) return;

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const nextList = [...list];
    [nextList[index], nextList[targetIndex]] = [nextList[targetIndex], nextList[index]];
    setContent((current) => ({ ...current!, [key]: nextList }));
  }

  if (!loggedIn) {
    return (
      <main className="page">
        <form
          className="card login formGrid"
          onSubmit={
            authMode === "login"
              ? handleLogin
              : authMode === "register"
                ? handleRegister
                : handleRegenerateApiKey
          }
        >
          <div>
            <p className="eyebrow">Portfolio Admin</p>
            <h1 className="cardTitle">
              {authMode === "login" && "Sign in"}
              {authMode === "register" && "Register owner"}
              {authMode === "regenerate-key" && "Regenerate API key"}
            </h1>
          </div>
          <div className="authTabs">
            <button className={authMode === "login" ? "authTab active" : "authTab"} onClick={() => setAuthMode("login")} type="button">
              Sign in
            </button>
            <button className={authMode === "register" ? "authTab active" : "authTab"} onClick={() => setAuthMode("register")} type="button">
              Register
            </button>
            <button className={authMode === "regenerate-key" ? "authTab active" : "authTab"} onClick={() => setAuthMode("regenerate-key")} type="button">
              API key
            </button>
          </div>
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          {authMode !== "regenerate-key" && (
            <Field label="Password" value={password} onChange={setPassword} type="password" />
          )}
          {authMode === "register" && (
            <Field label="Admin API key" value={apiKey} onChange={setApiKey} type="password" />
          )}
          {authMode === "regenerate-key" && (
            <>
              <div className="buttonRow">
                <button className="button secondary" disabled={busy || !email} onClick={handleRequestOtp} type="button">
                  Send OTP
                </button>
              </div>
              <Field label="OTP" value={otp} onChange={setOtp} />
            </>
          )}
          <button className="button" disabled={busy} type="submit">
            {busy && "Please wait..."}
            {!busy && authMode === "login" && "Sign in"}
            {!busy && authMode === "register" && "Register and sign in"}
            {!busy && authMode === "regenerate-key" && "Regenerate key"}
          </button>
          {newApiKey && (
            <div className="secretBox">
              <span>{newApiKey}</span>
            </div>
          )}
          <p className={message.includes("failed") || message.includes("Invalid") ? "message error" : "message"}>{message}</p>
        </form>
      </main>
    );
  }

  if (loadingContent) {
    return <AdminSkeleton />;
  }

  if (loadError || !content) {
    return (
      <main className="page">
        <div className="card login formGrid">
          <div>
            <p className="eyebrow">Portfolio Admin</p>
            <h1 className="cardTitle">Content unavailable</h1>
          </div>
          <p className="hint">{loadError || "Unable to load portfolio content."}</p>
          <button
            className="button"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Portfolio Admin</p>
            <h1 className="title">Content dashboard</h1>
          </div>
          <div className="buttonRow">
            <a className="button secondary" href={process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? "http://localhost:3000"} target="_blank">
              View portfolio
            </a>
            <button className="button secondary" onClick={logout} type="button">
              Log out
            </button>
          </div>
        </header>

        <div className="grid">
          <aside className="sidebar">
            {sections.map((section) => (
              <button
                className={activeSection === section.id ? "navButton active" : "navButton"}
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </aside>

          <div className="content">
            {activeSection === "hero" && (
              <SectionCard title="Hero" hint="Update the first viewport headline, intro, and CTA.">
                <div className="formGrid">
                  <Field label="Eyebrow" value={content.heroContent.eyebrow} onChange={(value) => updateHero({ eyebrow: value })} />
                  <Field label="Headline" value={content.heroContent.headline} onChange={(value) => updateHero({ headline: value })} />
                  <TextArea label="Intro" value={content.heroContent.intro} onChange={(value) => updateHero({ intro: value })} />
                  <Field label="CTA" value={content.heroContent.cta} onChange={(value) => updateHero({ cta: value })} />
                </div>
              </SectionCard>
            )}

            {activeSection === "nav" && (
              <SectionCard title="Navigation" hint="Add, remove, and update navigation links.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addNavItem} type="button">
                    Add Link
                  </button>
                </div>
                <div className="list">
                  {content.navItems.map((item, index) => (
                    <div className="item formGrid" key={`${item.name}-${index}`}>
                      <ItemToolbar
                        canMoveDown={index < content.navItems.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("navItems", index, 1)}
                        onMoveUp={() => moveItem("navItems", index, -1)}
                        onRemove={() => removeNavItem(index)}
                      />
                      <div className="formGrid twoCols">
                        <Field label="Label" value={item.name} onChange={(value) => updateNavItem(index, { name: value })} />
                        <Field label="Link" value={item.link} onChange={(value) => updateNavItem(index, { link: value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === "about" && (
              <SectionCard title="About" hint="Edit the content cards used in the about grid.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addGridItem} type="button">
                    Add About Card
                  </button>
                </div>
                <div className="list">
                  {content.gridItems.map((item, index) => (
                    <div className="item formGrid" key={item.id}>
                      <ItemToolbar
                        canMoveDown={index < content.gridItems.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("gridItems", index, 1)}
                        onMoveUp={() => moveItem("gridItems", index, -1)}
                        onRemove={() => removeGridItem(index)}
                      />
                      <TextArea label="Title" value={item.title} onChange={(value) => updateGridItem(index, { title: value })} />
                      <Field label="Description" value={item.description} onChange={(value) => updateGridItem(index, { description: value })} />
                      <Field label="Image path" value={item.img} onChange={(value) => updateGridItem(index, { img: value })} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === "projects" && (
              <SectionCard title="Projects" hint="Update project text, links, and screenshots.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addProject} type="button">
                    Add Project
                  </button>
                </div>
                <div className="list">
                  {content.projects.map((project, index) => (
                    <div className="item formGrid" key={project.id}>
                      <ItemToolbar
                        canMoveDown={index < content.projects.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("projects", index, 1)}
                        onMoveUp={() => moveItem("projects", index, -1)}
                        onRemove={() => removeProject(index)}
                      />
                      <div className="formGrid twoCols">
                        <Field label="Title" value={project.title} onChange={(value) => updateProject(index, { title: value })} />
                        <Field label="Live link" value={project.link} onChange={(value) => updateProject(index, { link: value })} />
                      </div>
                      <TextArea label="Description" value={project.des} onChange={(value) => updateProject(index, { des: value })} />
                      <Field label="Image URL" value={project.img} onChange={(value) => updateProject(index, { img: value })} />
                      <input
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="input"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadProjectImage(index, file);
                        }}
                        type="file"
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === "experience" && (
              <SectionCard title="Experience" hint="Update role titles and descriptions.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addExperience} type="button">
                    Add Experience
                  </button>
                </div>
                <div className="list">
                  {content.workExperience.map((item, index) => (
                    <div className="item formGrid" key={item.id}>
                      <ItemToolbar
                        canMoveDown={index < content.workExperience.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("workExperience", index, 1)}
                        onMoveUp={() => moveItem("workExperience", index, -1)}
                        onRemove={() => removeExperience(index)}
                      />
                      <Field label="Title" value={item.title} onChange={(value) => updateExperience(index, { title: value })} />
                      <TextArea label="Description" value={item.desc} onChange={(value) => updateExperience(index, { desc: value })} />
                      <Field label="Thumbnail path" value={item.thumbnail} onChange={(value) => updateExperience(index, { thumbnail: value })} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === "testimonials" && (
              <SectionCard title="Testimonials" hint="Edit quotes and attribution.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addTestimonial} type="button">
                    Add Testimonial
                  </button>
                </div>
                <div className="list">
                  {content.testimonials.map((item, index) => (
                    <div className="item formGrid" key={`${item.name}-${index}`}>
                      <ItemToolbar
                        canMoveDown={index < content.testimonials.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("testimonials", index, 1)}
                        onMoveUp={() => moveItem("testimonials", index, -1)}
                        onRemove={() => removeTestimonial(index)}
                      />
                      <TextArea label="Quote" value={item.quote} onChange={(value) => updateTestimonial(index, { quote: value })} />
                      <div className="formGrid twoCols">
                        <Field label="Name" value={item.name} onChange={(value) => updateTestimonial(index, { name: value })} />
                        <Field label="Title" value={item.title} onChange={(value) => updateTestimonial(index, { title: value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {activeSection === "social" && (
              <SectionCard title="Social links" hint="Update social URLs and icon paths.">
                <div className="sectionActions">
                  <button className="button secondary" onClick={addSocial} type="button">
                    Add Social Link
                  </button>
                </div>
                <div className="list">
                  {content.socialMedia.map((item, index) => (
                    <div className="item formGrid" key={item.id}>
                      <ItemToolbar
                        canMoveDown={index < content.socialMedia.length - 1}
                        canMoveUp={index > 0}
                        onMoveDown={() => moveItem("socialMedia", index, 1)}
                        onMoveUp={() => moveItem("socialMedia", index, -1)}
                        onRemove={() => removeSocial(index)}
                      />
                      <div className="formGrid twoCols">
                        <Field label="Link" value={item.link} onChange={(value) => updateSocial(index, { link: value })} />
                        <Field label="Icon path" value={item.img} onChange={(value) => updateSocial(index, { img: value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <div className="buttonRow">
              <button className="button" disabled={busy} onClick={() => persist(activeSection)} type="button">
                {busy ? "Saving..." : `Save ${activeLabel}`}
              </button>
            </div>
            <p className={message.includes("failed") || message.includes("Upload failed") ? "message error" : "message"}>{message}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function sectionValue(section: Section, content: PortfolioContent) {
  switch (section) {
    case "hero":
      return content.heroContent;
    case "nav":
      return content.navItems;
    case "about":
      return content.gridItems;
    case "projects":
      return content.projects;
    case "experience":
      return content.workExperience;
    case "testimonials":
      return content.testimonials;
    case "social":
      return content.socialMedia;
  }
}

function nextId(items: { id: number }[]) {
  return items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

function ItemToolbar({
  canMoveDown,
  canMoveUp,
  onMoveDown,
  onMoveUp,
  onRemove,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="itemToolbar">
      <div className="buttonRow">
        <button className="button secondary compact" disabled={!canMoveUp} onClick={onMoveUp} type="button">
          Up
        </button>
        <button className="button secondary compact" disabled={!canMoveDown} onClick={onMoveDown} type="button">
          Down
        </button>
      </div>
      <button className="button danger compact" onClick={onRemove} type="button">
        Remove
      </button>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <main className="page">
      <div className="shell">
        <header className="topbar">
          <div>
            <div className="skeletonLine short" />
            <div className="skeletonLine titleLine" />
          </div>
          <div className="buttonRow">
            <div className="skeletonButton" />
            <div className="skeletonButton" />
          </div>
        </header>

        <div className="grid">
          <aside className="sidebar">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="skeletonNav" key={index} />
            ))}
          </aside>

          <div className="content">
            <section className="card">
              <div className="cardHeader">
                <div>
                  <div className="skeletonLine headingLine" />
                  <div className="skeletonLine medium" />
                </div>
              </div>
              <div className="formGrid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div className="skeletonInput" key={index} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="cardHeader">
        <div>
          <h2 className="cardTitle">{title}</h2>
          <p className="hint">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      <input className="input" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </div>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea className="textarea" onChange={(event) => onChange(event.target.value)} value={value} />
    </div>
  );
}
