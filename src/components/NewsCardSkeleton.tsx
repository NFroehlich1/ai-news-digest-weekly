
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const NewsCardSkeleton = () => {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <CardHeader>
        <Skeleton className="h-6 w-4/5 mb-2" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardFooter>
    </Card>
  );
};

export default NewsCardSkeleton;
