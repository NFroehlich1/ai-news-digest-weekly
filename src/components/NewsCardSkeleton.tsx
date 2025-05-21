
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NewsCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <Skeleton className="h-6 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent className="py-4">
        <Skeleton className="h-32 w-full mb-4" /> {/* Image placeholder */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28" />
      </CardFooter>
    </Card>
  );
};

export default NewsCardSkeleton;
