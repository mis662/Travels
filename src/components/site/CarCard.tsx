import type { ReactNode } from "react";
import { BagIcon, SnowIcon, UsersIcon } from "@/components/ui/icons";

export interface CarInfo {
  name: string;
  exampleModels: string;
  seats: number;
  luggage: number;
  ac: boolean;
  imageUrl: string;
  description?: string;
}

export function CarImage({ car, className = "" }: { car: CarInfo; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={car.imageUrl || "/cars/sedan.svg"}
      alt={`${car.name} – ${car.exampleModels}`}
      loading="lazy"
      className={`aspect-[16/9] w-full rounded-lg bg-gradient-to-br from-primary-50 to-slate-100 object-contain ${className}`}
    />
  );
}

export function CarSpecs({ car }: { car: CarInfo }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
      <li className="flex items-center gap-1"><UsersIcon /> {car.seats} seats</li>
      <li className="flex items-center gap-1"><BagIcon /> {car.luggage} bags</li>
      <li className="flex items-center gap-1"><SnowIcon /> {car.ac ? "AC" : "Non-AC"}</li>
    </ul>
  );
}

export function CarCard({ car, children }: { car: CarInfo; children?: ReactNode }) {
  return (
    <article className="card flex flex-col p-4">
      <CarImage car={car} />
      <h3 className="mt-3 text-lg font-semibold text-slate-900">{car.name}</h3>
      <p className="text-sm text-slate-500">{car.exampleModels} or similar</p>
      <div className="mt-2"><CarSpecs car={car} /></div>
      {car.description && <p className="mt-2 text-sm text-slate-600">{car.description}</p>}
      {children && <div className="mt-auto pt-4">{children}</div>}
    </article>
  );
}
