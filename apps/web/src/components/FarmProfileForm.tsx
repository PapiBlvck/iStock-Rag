import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateFarmProfileInputSchema,
  type CreateFarmProfileInput,
  FarmingType,
} from '@rag-monorepo/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface FarmProfileFormProps {
  onSubmit: (data: CreateFarmProfileInput) => Promise<void>;
  defaultValues?: Partial<CreateFarmProfileInput>;
}

export function FarmProfileForm({
  onSubmit,
  defaultValues,
}: FarmProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFarmingTypes, setSelectedFarmingTypes] = useState<string[]>(
    defaultValues?.farmingType || []
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateFarmProfileInput>({
    resolver: zodResolver(CreateFarmProfileInputSchema),
    defaultValues: defaultValues || {
      farmingType: [],
      crops: [],
      livestock: [],
      challenges: [],
      goals: [],
      certifications: [],
    },
  });

  const handleFarmingTypeChange = (type: string) => {
    const newTypes = selectedFarmingTypes.includes(type)
      ? selectedFarmingTypes.filter((t) => t !== type)
      : [...selectedFarmingTypes, type];
    setSelectedFarmingTypes(newTypes);
    setValue('farmingType', newTypes as any);
  };

  const onFormSubmit = async (data: CreateFarmProfileInput) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Farm Profile</CardTitle>
        <CardDescription>
          Tell us about your farm to get personalized recommendations
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <CardContent className="space-y-6">
          {/* Farm Name */}
          <div className="space-y-2">
            <Label htmlFor="farmName">Farm Name *</Label>
            <Input
              id="farmName"
              {...register('farmName')}
              placeholder="Green Valley Farm"
            />
            {errors.farmName && (
              <p className="text-sm text-destructive">
                {errors.farmName.message}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location.country">Country *</Label>
                <Input
                  id="location.country"
                  {...register('location.country')}
                  placeholder="United States"
                />
                {errors.location?.country && (
                  <p className="text-sm text-destructive">
                    {errors.location.country.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location.region">Region/State *</Label>
                <Input
                  id="location.region"
                  {...register('location.region')}
                  placeholder="California"
                />
                {errors.location?.region && (
                  <p className="text-sm text-destructive">
                    {errors.location.region.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location.city">City</Label>
                <Input
                  id="location.city"
                  {...register('location.city')}
                  placeholder="Fresno"
                />
              </div>
            </div>
          </div>

          {/* Farm Size */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Farm Size</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="farmSize.value">Size *</Label>
                <Input
                  id="farmSize.value"
                  type="number"
                  step="0.01"
                  {...register('farmSize.value', { valueAsNumber: true })}
                  placeholder="100"
                />
                {errors.farmSize?.value && (
                  <p className="text-sm text-destructive">
                    {errors.farmSize.value.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmSize.unit">Unit *</Label>
                <Select id="farmSize.unit" {...register('farmSize.unit')}>
                  <option value="">Select unit</option>
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="sqft">Square Feet</option>
                  <option value="sqm">Square Meters</option>
                </Select>
                {errors.farmSize?.unit && (
                  <p className="text-sm text-destructive">
                    {errors.farmSize.unit.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmSize.category">Category *</Label>
                <Select
                  id="farmSize.category"
                  {...register('farmSize.category')}
                >
                  <option value="">Select category</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
                {errors.farmSize?.category && (
                  <p className="text-sm text-destructive">
                    {errors.farmSize.category.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Farming Type */}
          <div className="space-y-2">
            <Label>Farming Type * (Select all that apply)</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {FarmingType.options.map((type) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFarmingTypes.includes(type)}
                    onChange={() => handleFarmingTypeChange(type)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
            {errors.farmingType && (
              <p className="text-sm text-destructive">
                {errors.farmingType.message}
              </p>
            )}
          </div>

          {/* Crops and Livestock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crops">Crops (comma-separated)</Label>
              <Textarea
                id="crops"
                {...register('crops', {
                  setValueAs: (v) =>
                    v ? v.split(',').map((s: string) => s.trim()) : [],
                })}
                placeholder="Corn, Wheat, Soybeans"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="livestock">Livestock (comma-separated)</Label>
              <Textarea
                id="livestock"
                {...register('livestock', {
                  setValueAs: (v) =>
                    v ? v.split(',').map((s: string) => s.trim()) : [],
                })}
                placeholder="Cattle, Chickens, Pigs"
              />
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Experience</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience.years">Years of Experience *</Label>
                <Input
                  id="experience.years"
                  type="number"
                  {...register('experience.years', { valueAsNumber: true })}
                  placeholder="5"
                />
                {errors.experience?.years && (
                  <p className="text-sm text-destructive">
                    {errors.experience.years.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience.level">Experience Level *</Label>
                <Select id="experience.level" {...register('experience.level')}>
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </Select>
                {errors.experience?.level && (
                  <p className="text-sm text-destructive">
                    {errors.experience.level.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Challenges, Goals, Certifications */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="challenges">
                Challenges (comma-separated, optional)
              </Label>
              <Textarea
                id="challenges"
                {...register('challenges', {
                  setValueAs: (v) =>
                    v ? v.split(',').map((s: string) => s.trim()) : [],
                })}
                placeholder="Water scarcity, Pest control, Market access"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goals">Goals (comma-separated, optional)</Label>
              <Textarea
                id="goals"
                {...register('goals', {
                  setValueAs: (v) =>
                    v ? v.split(',').map((s: string) => s.trim()) : [],
                })}
                placeholder="Increase yield, Reduce costs, Go organic"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certifications">
                Certifications (comma-separated, optional)
              </Label>
              <Textarea
                id="certifications"
                {...register('certifications', {
                  setValueAs: (v) =>
                    v ? v.split(',').map((s: string) => s.trim()) : [],
                })}
                placeholder="Organic, GAP, Rainforest Alliance"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving...' : 'Save Farm Profile'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

