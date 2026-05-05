import React, { useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import toast from "react-hot-toast";
import { FiMail, FiMessageSquare, FiSend, FiUser } from "react-icons/fi";

const SERVICE_ID = "service_azsaobb";
const TEMPLATE_ID = "template_kfumb0d";
const PUBLIC_KEY = "xxvK2qybkwWIFB-Zs";

const InputField = ({
  icon: Icon,
  label,
  value,
  onChange,
  placeholder,
  name,
  type,
}) => (
  <label className="flex flex-col gap-2">
    <span className="text-sm font-medium text-slate-200">{label}</span>
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300" />
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="subpage-input pl-11"
      />
    </div>
  </label>
);

function Contact() {
  const formRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateEmail = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return regex.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmailError("");
    setNameError("");

    if (!validateEmail(form.email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (!form.name.trim()) {
      setNameError("Name is required.");
      return;
    }

    setLoading(true);

    emailjs
      .send(
        SERVICE_ID,
        TEMPLATE_ID,
        {
          from_name: form.name,
          to_name: "sarthak khatpe",
          from_email: form.email,
          to_email: "sarthakkhatpe24@gmail.com",
          message: form.message,
        },
        PUBLIC_KEY
      )
      .then(() => {
        setLoading(false);
        toast.success("Thank you! I will get back to you soon.", {
          duration: 3000,
        });
        setForm({ name: "", email: "", message: "" });
      })
      .catch((error) => {
        setLoading(false);
        console.error(error);
        toast.error("Something went wrong. Please try again.");
      });
  };

  return (
    <div className="subpage-shell px-6 py-14 lg:px-10">
      <div className="subpage-inner mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.88fr_1.12fr]">
        <section className="subpage-hero-card">
          <span className="subpage-badge">
            <FiMail />
            Get in touch
          </span>

          <h1 className="subpage-heading mt-6">
            Let’s talk about your <span>resume workflow or support needs.</span>
          </h1>

          <p className="subpage-copy mt-6">
            Reach out if you need help with the builder, feedback tools, or
            export flow. The page now uses the same visual system as the landing
            experience, so it feels like part of the same product.
          </p>

          <div className="mt-8 space-y-4">
            <div className="subpage-stat">
              <strong>Email support</strong>
              <span>Send details and get a direct response.</span>
            </div>
            <div className="subpage-stat">
              <strong>Product questions</strong>
              <span>Ask about templates, ATS checks, or resume generation.</span>
            </div>
            <div className="subpage-stat">
              <strong>Clear follow-up</strong>
              <span>Share your issue with enough context and move faster.</span>
            </div>
          </div>
        </section>

        <section className="subpage-glass-card">
          <p className="subpage-overline">Contact Form</p>
          <h2 className="subpage-title">Send a message</h2>

          <form ref={formRef} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
            <InputField
              icon={FiUser}
              label="Your Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Insert your name here..."
              type="text"
            />
            {nameError ? <span className="text-sm text-rose-300">{nameError}</span> : null}

            <InputField
              icon={FiMail}
              label="Email Address"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="What's your email address?"
              type="email"
            />
            {emailError ? <span className="text-sm text-rose-300">{emailError}</span> : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-200">Your Message</span>
              <div className="relative">
                <FiMessageSquare className="pointer-events-none absolute left-4 top-4 text-cyan-300" />
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="What do you want to say?"
                  rows={6}
                  className="subpage-textarea pl-11"
                />
              </div>
            </label>

            <button
              type="submit"
              className="landing-button-primary w-fit"
              disabled={loading}
            >
              <FiSend />
              {loading ? "Sending..." : "Send Message"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default Contact;
