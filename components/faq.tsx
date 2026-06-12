"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    question: "What is Acadify?",
    answer:
      "Acadify is a modern, cloud-based school management platform built for Indian schools. It replaces paper registers and disconnected tools with a single system for managing students, teachers, attendance, timetables, calendars, notifications, and more — all in one place.",
  },
  {
    question: "What features does Acadify include?",
    answer:
      "Acadify includes Attendance Tracking for students and teachers, Timetable Management, Class Log, School Calendar with holidays and events, Notifications and announcements, Birthday Reminders, Student and Teacher Profile Management, and ACADIFY ARENA — a gamified quiz competition platform for students.",
  },
  {
    question: "Who is Acadify designed for?",
    answer:
      "Acadify is designed for K-12 schools in India. It serves four types of users: School Admins who manage daily operations, Teachers who mark attendance and view their schedules, Students who access their attendance, timetable, and notifications, and Super Admins at the platform level.",
  },
  {
    question: "What is ACADIFY ARENA?",
    answer:
      "ACADIFY ARENA is Acadify's built-in gamified quiz competition feature. Students participate in competitive quiz challenges, making learning engaging and interactive while giving teachers a modern way to assess student knowledge.",
  },
  {
    question: "How do I get started with Acadify?",
    answer:
      "Simply book a demo call with the Acadify team. We handle everything — data migration, onboarding, and setup. Your school admin, teachers, and students each get their own tailored dashboard and login credentials from day one.",
  },
  {
    question: "Is Acadify free?",
    answer:
      "All Acadify plans include a free trial. After the trial, pricing is customised based on your school's student count, keeping it affordable for institutions of every size. Contact us to get a quote.",
  },
  {
    question: "Does Acadify work on mobile devices?",
    answer:
      "Yes. Acadify is fully responsive and works on any device — desktop, tablet, or smartphone — without requiring an app download. It is also a Progressive Web App (PWA), so users can add it to their home screen for app-like access.",
  },
  {
    question: "How is student data kept secure?",
    answer:
      "Acadify uses TLS encryption for all data in transit, bcrypt-hashed passwords, and role-based access controls so users only see what is relevant to them. Your school's data belongs to you — Acadify never sells or shares it with third parties.",
  },
];

export default function FAQ() {
  return (
    <section
      id="faq"
      className="bg-white py-20 border-t border-gray-200"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-12">
          <h2
            id="faq-heading"
            className="text-3xl font-bold text-gray-900 md:text-4xl"
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-base text-gray-500 md:text-lg">
            Everything you need to know about Acadify.
          </p>
        </div>

        <Accordion.Root type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => (
            <Accordion.Item
              key={index}
              value={`item-${index}`}
              className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between px-6 py-5 text-left text-base font-semibold text-gray-900 hover:bg-gray-100 transition-colors duration-200 cursor-pointer">
                  <span>{faq.question}</span>
                  <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-6 pb-5 text-base leading-relaxed text-gray-600">
                {faq.answer}
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
