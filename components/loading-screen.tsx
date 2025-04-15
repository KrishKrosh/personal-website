export default function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black/80">
      <div className="ethereal-loader">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>
    </div>
  )
}
