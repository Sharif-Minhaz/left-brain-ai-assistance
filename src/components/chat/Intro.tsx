import Image from "next/image";
import brand from "../../../src/assets/images/brand.svg";

export default function Intro() {
	return (
		<div className="flex flex-col items-center justify-center mb-4">
			<div className="flex items-center gap-3">
				<Image width={50} height={50} src={brand} alt="brand" />
				<p className="font-bold text-[28px] text-[#608dff]">Hi, I&apos;m LeftBrain</p>
			</div>
			<p className="mt-4 text-[14px]">How can I help you today?</p>
		</div>
	);
}
