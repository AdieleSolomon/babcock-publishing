"use client";

import {
  Calendar,
  Clock,
  Users,
  Award,
  BookOpen,
  Video,
  Download,
} from "lucide-react";
import { useState } from "react";

export default function TrainingPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const workshops = [
    {
      id: 1,
      title: "Academic Writing Masterclass",
      category: "writing",
      date: "2024-03-15",
      time: "10:00 AM",
      duration: "3 hours",
      seats: 30,
      enrolled: 25,
      instructor: "Prof. Adeola Johnson",
      level: "Beginner",
      price: "Free",
      description: "Learn the fundamentals of academic writing and publishing.",
    },
    {
      id: 2,
      title: "Research Paper Publishing",
      category: "publishing",
      date: "2024-03-20",
      time: "2:00 PM",
      duration: "4 hours",
      seats: 25,
      enrolled: 18,
      instructor: "Dr. Michael Chen",
      level: "Intermediate",
      price: "₦5,000",
      description:
        "Step-by-step guide to publishing research papers in reputable journals.",
    },
    {
      id: 3,
      title: "Book Proposal Writing",
      category: "writing",
      date: "2024-03-25",
      time: "9:00 AM",
      duration: "2 days",
      seats: 20,
      enrolled: 15,
      instructor: "Dr. Sarah Williams",
      level: "Advanced",
      price: "₦10,000",
      description:
        "Craft compelling book proposals that get accepted by publishers.",
    },
    {
      id: 4,
      title: "Copyright & Intellectual Property",
      category: "legal",
      date: "2024-04-05",
      time: "11:00 AM",
      duration: "2 hours",
      seats: 40,
      enrolled: 35,
      instructor: "Barr. James Okoro",
      level: "All Levels",
      price: "Free",
      description:
        "Understanding copyright laws and protecting your intellectual property.",
    },
  ];

  const resources = [
    {
      title: "Writing Style Guide",
      type: "PDF",
      size: "2.4 MB",
      downloads: 1200,
    },
    {
      title: "Publishing Timeline",
      type: "PDF",
      size: "1.8 MB",
      downloads: 850,
    },
    {
      title: "Sample Book Proposal",
      type: "DOC",
      size: "3.2 MB",
      downloads: 950,
    },
    {
      title: "Journal Selection Guide",
      type: "PDF",
      size: "2.1 MB",
      downloads: 1100,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container-custom section-padding">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-babcock-blue mb-6">
            Student Training <span className="text-babcock-gold">Program</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Equipping the next generation of scholars and writers with essential
            publishing skills. Join our workshops, access resources, and launch
            your publishing career.
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn-primary inline-flex items-center">
              <Calendar className="mr-2 w-5 h-5" />
              View Schedule
            </button>
            <button className="btn-secondary inline-flex items-center">
              <Users className="mr-2 w-5 h-5" />
              Join Community
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {[
            "all",
            "writing",
            "publishing",
            "research",
            "legal",
            "technology",
          ].map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full capitalize font-medium transition
                ${
                  selectedCategory === category
                    ? "bg-babcock-blue text-white"
                    : "bg-white text-gray-700 hover:bg-blue-50 border"
                }`}>
              {category}
            </button>
          ))}
        </div>

        {/* Workshops Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {workshops
            .filter(
              (w) =>
                selectedCategory === "all" || w.category === selectedCategory,
            )
            .map((workshop) => (
              <div
                key={workshop.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-babcock-blue rounded-full text-sm font-semibold">
                      {workshop.category}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold
                      ${workshop.price === "Free" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {workshop.price}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {workshop.title}
                  </h3>
                  <p className="text-gray-600 mb-6">{workshop.description}</p>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {workshop.date} • {workshop.time}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {workshop.duration}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {workshop.enrolled}/{workshop.seats} seats filled
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Award className="w-4 h-4 mr-2" />
                      {workshop.instructor}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button className="btn-primary">Register Now</button>
                    <button className="text-babcock-blue hover:text-babcock-navy font-medium">
                      Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Resources Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-babcock-blue mb-2">
                Learning Resources
              </h2>
              <p className="text-gray-600">
                Download free resources to enhance your publishing skills
              </p>
            </div>
            <button className="btn-secondary">
              <Download className="mr-2 w-5 h-5" />
              Download All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {resources.map((resource, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-xl p-5 hover:border-babcock-blue transition">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mr-4">
                    <BookOpen className="w-6 h-6 text-babcock-blue" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">
                      {resource.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {resource.type} • {resource.size}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {resource.downloads} downloads
                  </span>
                  <button className="text-babcock-blue hover:text-babcock-navy font-medium">
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Video Tutorials */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-babcock-blue mb-8 text-center">
            Video Tutorials
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                title: "How to Write an Abstract",
                duration: "15:32",
                views: "2.4K",
              },
              {
                title: "Choosing the Right Journal",
                duration: "22:18",
                views: "1.8K",
              },
              {
                title: "Responding to Reviewers",
                duration: "18:45",
                views: "1.2K",
              },
            ].map((video, index) => (
              <div
                key={index}
                className="bg-gray-900 rounded-xl overflow-hidden">
                <div className="aspect-video bg-gray-800 flex items-center justify-center">
                  <button className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
                    <Video className="w-8 h-8 text-white" />
                  </button>
                </div>
                <div className="p-6">
                  <h3 className="text-white font-bold mb-2">{video.title}</h3>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>{video.duration}</span>
                    <span>{video.views} views</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-babcock-blue to-babcock-navy rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Master Publishing?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join our comprehensive training program and get personalized
            mentorship from industry experts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-babcock-blue hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold">
              Enroll in Certificate Program
            </button>
            <button className="bg-transparent border-2 border-white hover:bg-white/10 px-8 py-3 rounded-lg font-semibold">
              Schedule Consultation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
