const FeaturesSection = () => {
  return (
    <section
      id="features"
      className="py-24 bg-gray-950 relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-orange-900/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="text-center max-w-3xl mx-auto mb-20 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Powerful Features for Modern Development
          </h2>
          <p className="text-xl text-gray-400">
            Everything you need to build, deploy, and scale your applications
          </p>
        </div>

        <div className="space-y-32">
          {/* Feature 1 - AI-Powered Code Generation */}
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 animate-fade-in-left">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                <i className="fas fa-brain text-3xl text-blue-400"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">
                  AI-Powered Code Generation
                </h3>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Transform natural language descriptions into complete,
                  production-ready applications. Our advanced AI understands
                  your requirements and generates clean, efficient code
                  following best practices and modern development patterns.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  React & Node.js
                </span>
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  TypeScript Support
                </span>
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  Best Practices
                </span>
              </div>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-fade-in-right">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-2xl blur-xl"></div>
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl overflow-hidden hover:border-gray-700 transition-colors duration-300">
                  <div className="flex items-center gap-4 bg-gray-950/50 p-4 rounded-xl border border-gray-800 mb-6 group hover:border-blue-500/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <i className="fas fa-magic"></i>
                    </div>
                    <span className="text-gray-300 font-medium">
                      "Create a todo app with drag and drop"
                    </span>
                  </div>
                  <div className="flex justify-center mb-6">
                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 animate-bounce">
                      <i className="fas fa-arrow-down"></i>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      {
                        icon: "fab fa-react",
                        text: "TodoApp.jsx",
                        color: "text-blue-400",
                        bg: "bg-blue-400/10",
                      },
                      {
                        icon: "fas fa-server",
                        text: "server.js",
                        color: "text-green-400",
                        bg: "bg-green-400/10",
                      },
                      {
                        icon: "fas fa-palette",
                        text: "styles.css",
                        color: "text-pink-400",
                        bg: "bg-pink-400/10",
                      },
                    ].map((file, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center gap-3 p-4 rounded-xl bg-gray-950/50 border border-gray-800 hover:-translate-y-1 hover:border-gray-600 transition-all duration-300 cursor-default"
                      >
                        <div
                          className={`w-12 h-12 rounded-full ${file.bg} flex items-center justify-center`}
                        >
                          <i
                            className={`${file.icon} text-2xl ${file.color}`}
                          ></i>
                        </div>
                        <span className="text-sm font-medium text-gray-300">
                          {file.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 - Instant Download */}
          <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
            <div className="flex-1 space-y-8 animate-fade-in-right">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-300 shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                <i className="fas fa-rocket text-3xl text-orange-400"></i>
              </div>
              <div>
                <h3 className="text-3xl font-bold mb-4">Instant Download</h3>
                <p className="text-lg text-gray-400 leading-relaxed">
                  Get your complete project structure instantly. Download as a
                  ZIP file and start working on it immediately. No complex setup
                  required - just click and download.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  One-Click Download
                </span>
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  Complete Source Code
                </span>
                <span className="px-4 py-2 rounded-full bg-gray-900 border border-gray-800 text-sm font-medium text-gray-300">
                  Zero Configuration
                </span>
              </div>
            </div>
            <div className="flex-1 w-full lg:w-auto animate-fade-in-left">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-2xl blur-xl"></div>
                <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-10 shadow-2xl overflow-hidden hover:border-gray-700 transition-colors duration-300 flex items-center justify-center min-h-[300px]">
                  <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <div className="w-24 h-24 rounded-full bg-orange-500/10 flex items-center justify-center mb-2 animate-bounce-slow shadow-[0_0_40px_rgba(249,115,22,0.2)]">
                      <i className="fas fa-download text-5xl text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.5)]"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">
                      Download Project
                    </span>
                    <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 w-2/3 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_25%,rgba(255,255,255,0.2)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.2)_75%,rgba(255,255,255,0.2)_100%)] bg-[length:20px_20px] animate-stripe"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
