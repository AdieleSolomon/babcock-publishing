"use client";

import { ArrowRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function HeroSection() {
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  return (
    <section className="relative bg-gradient-to-r from-babcock-blue to-babcock-navy text-white">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          }}></div>
      </div>

      <div className="container-custom section-padding relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <div>
            <div className="inline-flex items-center px-4 py-2 bg-babcock-gold text-babcock-blue rounded-full font-semibold mb-6">
              <span className="mr-2">🎓</span> Excellence in Academic Publishing
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transforming Ideas into{" "}
              <span className="text-babcock-gold">Published Excellence</span>
            </h1>

            <p className="text-xl text-gray-200 mb-8">
              Babcock University Publishing Company is your premier destination
              for academic publishing, professional printing, and scholarly
              communication solutions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/authors/register"
                className="btn-secondary inline-flex items-center justify-center">
                Become an Author <ArrowRight className="ml-2 w-5 h-5" />
              </Link>

              <button
                onClick={() => setIsVideoPlaying(true)}
                className="inline-flex items-center justify-center px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-babcock-blue transition">
                <PlayCircle className="mr-2 w-5 h-5" />
                Watch Our Story
              </button>
            </div>
          </div>

          {/* Right Column - Image/Video */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1544716278-e513176f20b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt="Babcock University Publishing"
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-babcock-blue/50 to-transparent"></div>
            </div>

            {/* Stats Overlay */}
            <div className="absolute -bottom-6 left-6 right-6 bg-white rounded-xl shadow-xl p-6 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-babcock-blue">500+</div>
                <div className="text-sm text-gray-600">Books Published</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-babcock-blue">2K+</div>
                <div className="text-sm text-gray-600">Authors</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-babcock-blue">25+</div>
                <div className="text-sm text-gray-600">Years Experience</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {isVideoPlaying && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button
              onClick={() => setIsVideoPlaying(false)}
              className="absolute -top-12 right-0 text-white hover:text-babcock-gold">
              Close
            </button>
            <div className="aspect-video bg-gray-800 rounded-lg overflow-hidden">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/your-video-id"
                title="Babcock University Publishing"
                allowFullScreen></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
